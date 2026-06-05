# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A validation POC for **metaswarm / multi-agent coding workflows**. The goal is to exercise CLI-based agentic tooling (Claude Code, Gemini CLI, Codex CLI, metaswarm) on a bounded real problem — Hebrew text normalization and anagram matching — not to ship a production app.

The implementation is a **static, client-side web app** (`web/`): React 18 + TypeScript + Vite, deployed to GitHub Pages. There is no backend and no other implementation. (An earlier Python reference implementation was removed; the TS code under `web/src/lib/` is now authoritative.)

## Architecture (`web/src/`)

- `App.tsx` owns all state. Components are presentational.
- `lib/hebrew.ts` — niqqud strip, final-letter normalization, text normalization.
- `lib/matcher.ts` — `canFormWord(rack, word)` with `?` wildcard.
- `lib/dictionary.ts` — load/preprocess the word list, find dictionary words formable from a rack.
- `lib/scoring.ts` — placeholder scoring (1 pt / letter).
- `lib/multiwordAnagrams.ts` — exact multi-word anagrams via bounded DFS over the dictionary (cap: 200 combinations, input length ≤14, no `?` support).
- `lib/patternSearch.ts` — crossword/positional pattern search (cap: 500 matches, exact length).
- `lib/hebrew.ts::restoreFinalLettersForDisplay` rewrites the **last** letter of each Hebrew word to its final form (`כ→ך`, `מ→ם`, `נ→ן`, `פ→ף`, `צ→ץ`) at render time. Matching stays in base form so the bundled dictionary (which uses base forms at word ends) remains searchable.
- `strings.tsx` holds all user-facing strings + `APP_VERSION` (see rule below).
- No router, no state library, no Web Worker, no UI framework. Plain React + plain CSS.

### Dictionary

The bundled dictionary lives at `web/public/hebrew_dict.txt` (Vite serves it as a static asset; the app fetches it at runtime). It is the **only** copy — the former `data/` source directory was removed along with the Python tree.

**Final-letter normalization defaults to ON in the UI** because the dictionary was authored with base forms (`מ`, `נ`, …) at word ends — without the toggle a user typing "שלום" would match nothing. Users can flip it in the Options panel.

## Commands

```bash
cd web
npm install
npm run dev          # vite dev server, hot reload
npm run build        # tsc -b && vite build → web/dist/
npm run preview      # serve the production build
npm test             # vitest run (one shot)
npm run test:watch   # vitest watch mode
```

## APP_VERSION bump rule

**Every code-changing prompt must bump `APP_VERSION` in `web/src/strings.tsx` by +0.01** (e.g. `1.23` → `1.24`). The footer displays it so the user can confirm a deploy went out. Pure-doc or pure-test changes that touch no shipped code may skip the bump, but bias toward bumping when in doubt.

## Core rules

- **Keep it simple.** Smallest correct solution wins.
- **No external services** anywhere: no HTTP (beyond fetching the bundled dictionary), no DB, no cloud SDKs, no telemetry. The app is intentionally static and offline-capable after first load.
- **No new runtime deps** without a documented reason — currently just React.
- **One concern per commit / PR.**
- **Always run tests before reporting done** — `npm test` from `web/`.

## Hebrew Unicode rules

- Niqqud lives at U+0591–U+05C7; strip via `removeNiqqud()` in `web/src/lib/hebrew.ts`. No ad-hoc regex.
- Final letters (ך ם ן ף ץ) are **distinct** from their base forms by default in the lib functions. Normalization is opt-in (the UI opts in by default — see Dictionary above).
- Document any NFC/NFD assumption in code.

## Code style

- Explicit types on all exported TS symbols.
- Short JSDoc that explains *what* and *why*, not *how*.
- No abstractions invented for hypothetical future use.
- Don't restate the code in comments.

## Repository layout

```
web/                  React + TS + Vite static site (own package.json)
  src/lib/            core logic + co-located *.test.ts
  src/components/     presentational React components
  public/             static assets including the bundled dictionary
.ai/                  agent task / handoff / validation notes
bin/, scripts/        helper scripts (PR comments, cost estimator, beads fetchers)
AGENTS.md             tool-neutral version of this file for non-Claude agents
```

## Deployment

The web app deploys to GitHub Pages as static files. `vite.config.ts` sets `base: "./"` so `dist/` works at a domain root, user site, or project subpath without reconfiguration. Manual deploy procedure lives in `README.md`. There is intentionally no CI workflow yet — keep it that way unless the user asks.
