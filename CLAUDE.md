# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A validation POC for **metaswarm / multi-agent coding workflows**. The goal is to exercise CLI-based agentic tooling (Claude Code, Gemini CLI, Codex CLI, metaswarm) on a bounded real problem — Hebrew text normalization and anagram matching — not to ship a production app.

## Architecture — two parallel implementations

The repo carries **two trees that solve the same problem in different stacks**, sharing one data file:

| Tree | Stack | Status |
|---|---|---|
| `src/hebrew_anagram/` + `tests/` | Pure Python + pytest | Reference implementation. Authoritative for behavior. |
| `web/` | React 18 + TypeScript + Vite, static client-side only | TS port of the same logic; ships to GitHub Pages. |

Both consume `data/hebrew_dict.txt`. The web build keeps a **copy** at `web/public/hebrew_dict.txt` (Vite serves it as a static asset) — when `data/hebrew_dict.txt` changes, re-copy it; don't edit the copy directly.

### Python package (`src/hebrew_anagram/`)
- `letters.py` — niqqud strip, final-letter normalization, text normalization
- `matcher.py` — `can_form_word(rack, word)` with `?` wildcard
- `dictionary.py` — load word lists, find dictionary words formable from a rack
- `scoring.py` — placeholder scoring (1 pt / letter)

### Web app (`web/src/`)
- `App.tsx` owns all state. Components are presentational.
- `lib/hebrew.ts`, `lib/matcher.ts`, `lib/dictionary.ts`, `lib/scoring.ts` — TS port of the Python logic.
- `lib/multiwordAnagrams.ts` — exact multi-word anagrams via bounded DFS over the dictionary (cap: 200 combinations, input length ≤14, no `?` support).
- `lib/patternSearch.ts` — crossword/positional pattern search (cap: 500 matches, exact length).
- `lib/hebrew.ts::restoreFinalLettersForDisplay` rewrites the **last** letter of each Hebrew word to its final form (`כ→ך`, `מ→ם`, `נ→ן`, `פ→ף`, `צ→ץ`) at render time. Matching stays in base form so the bundled dictionary (which uses base forms at word ends) remains searchable.
- `strings.tsx` holds all user-facing strings + `APP_VERSION` (see rule below).
- No router, no state library, no Web Worker, no UI framework. Plain React + plain CSS.

### Deliberate Python/web divergence
- **Final-letter normalization defaults to OFF in Python, ON in the web UI.** The bundled `hebrew_dict.txt` was authored with base forms (`מ`, `נ`, …) at word ends, so without the toggle a user typing "שלום" matches nothing. The Python reference keeps the toggle off for code-level clarity; end users can flip it either way in the UI.

## Commands

### Python
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest                                  # full suite
pytest tests/test_matcher.py            # single file
pytest tests/test_matcher.py::test_x    # single test
pytest --cov --cov-fail-under=100       # coverage gate (see below)
```

### Web
```bash
cd web
npm install
npm run dev          # vite dev server, hot reload
npm run build        # tsc -b && vite build → web/dist/
npm run preview      # serve the production build
npm test             # vitest run (one shot)
npm run test:watch   # vitest watch mode
```

## Coverage gate — 100% enforced

`.coverage-thresholds.json` requires **100% lines, branches, functions, statements**. The enforcement command is `pytest --cov --cov-fail-under=100`, and it blocks both PR creation and task completion. Any behavior change MUST come with tests that keep coverage at 100%.

## APP_VERSION bump rule

**Every code-changing prompt must bump `APP_VERSION` in `web/src/strings.tsx` by +0.01** (e.g. `1.23` → `1.24`). The footer displays it so the user can confirm a deploy went out. Pure-doc or pure-test changes that touch no shipped code may skip the bump, but bias toward bumping when in doubt.

## Core rules

- **Keep it simple.** Smallest correct solution wins.
- **Pure Python only** in `src/hebrew_anagram/` — no new runtime deps without a documented reason. `pyproject.toml` currently has *zero* runtime dependencies.
- **No external services** anywhere: no HTTP, no DB, no cloud SDKs, no telemetry. The web app is intentionally static and offline-capable after first load.
- **One concern per commit / PR.**
- **Always run tests before reporting done** — `pytest` for Python changes, `npm test` (from `web/`) for TS changes, both if touching shared semantics.
- **Mirror Python and TS behavior** when changing shared logic. If you intentionally diverge (like the final-letter default above), document it in both `CLAUDE.md` and `README.md`.

## Hebrew Unicode rules

- Niqqud lives at U+0591–U+05C7; strip via `remove_niqqud()` (Python) or the equivalent in `web/src/lib/hebrew.ts`. No ad-hoc regex.
- Final letters (ך ם ן ף ץ) are **distinct** from their base forms by default. Normalization is opt-in.
- Document any NFC/NFD assumption in code.
- `can_form_word` validates input type and raises `TypeError` for non-`str`.

## Code style

- Type hints on all public Python functions; explicit types on all exported TS symbols.
- Short docstrings/JSDoc that explain *what* and *why*, not *how*.
- No abstractions invented for hypothetical future use.
- Don't restate the code in comments.

## Repository layout

```
src/hebrew_anagram/   library source (Python)
tests/                pytest suite, mirrors src modules
web/                  React + TS + Vite static site (own package.json)
  src/lib/            TS port of the Python logic + co-located *.test.ts
  src/components/     presentational React components
  public/             static assets including the bundled dictionary
data/                 word lists (sample + full dict, source of truth)
.ai/                  agent task / handoff / validation notes
bin/, scripts/        helper scripts (PR comments, cost estimator, agent setup)
AGENTS.md             tool-neutral version of this file for non-Claude agents
```

## Deployment

The web app deploys to GitHub Pages as static files. `vite.config.ts` sets `base: "./"` so `dist/` works at a domain root, user site, or project subpath without reconfiguration. Manual deploy procedure lives in `README.md`. There is intentionally no CI workflow yet — keep it that way unless the user asks.
