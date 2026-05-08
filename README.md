# metaswarm-hebrew-anagram-poc

A minimal proof-of-concept for **validating metaswarm / multi-agent coding workflows**.

This is **not** a production Hebrew anagram application. Its purpose is to exercise CLI-based agentic workflows (Claude Code, Gemini CLI, Codex CLI, metaswarm) on a real but bounded problem — Hebrew text normalization and letter matching.

The repository hosts two parallel implementations:

| Tree | Stack | Role |
|---|---|---|
| `src/hebrew_anagram/` + `tests/` | Pure Python + pytest | Reference implementation. 100% test coverage. Authoritative for behavior. |
| `web/` | React + TypeScript + Vite | Static, client-side mobile-first web app. Reimplements the Python logic in TS and ships as static files suitable for GitHub Pages. No backend, no API, no database. |

Both trees use the same data file (`data/hebrew_dict.txt`); the web app keeps a copy at `web/public/hebrew_dict.txt` so Vite can bundle it as a static asset.

---

## Python package — what it does

| Module | Responsibility |
|---|---|
| `letters.py` | Niqqud removal, final-letter normalization, text normalization |
| `matcher.py` | Check whether a word can be formed from a letter pool (with wildcard support) |
| `scoring.py` | Placeholder word scoring (letter count) |
| `dictionary.py` | Load + preprocess word lists, find dictionary words formable from a rack |

---

## Setup

```bash
# 1. Create a virtual environment
python3 -m venv .venv
source .venv/bin/activate       # macOS / Linux
# .venv\Scripts\activate        # Windows

# 2. Install in editable mode (includes dev deps)
pip install -e ".[dev]"
```

---

## Running tests

```bash
pytest
```

Expected output: all tests pass, no external network calls.

---

## Usage examples

```python
from hebrew_anagram import normalize_text, can_form_word, score_word

# Normalize — strips niqqud by default
normalize_text("שָׁלוֹם")          # → "שלום"
normalize_text("שָׁלוֹם", normalize_finals=True)  # → "שלומ"

# Matching
can_form_word("שלומבית", "שלום")   # → True   (rack has all needed letters)
can_form_word("של?", "שלם")        # → True   (? is wildcard)
can_form_word("שלו", "שלום")       # → False  (missing מ)

# Scoring (placeholder — counts Hebrew letters)
score_word("שלום")                 # → 4
score_word("ירושלים")              # → 7

# Dictionary lookup — find every dictionary word formable from a rack
from hebrew_anagram import find_matching_words
find_matching_words("ספרשבת", "data/sample_words_he.txt")
# → list of words from the dictionary that can be spelled with those letters,
#   in the order they appear in the file. One-letter entries are filtered by
#   default (min_length=2). Pass normalize_finals=True if you want ם/מ etc.
#   collapsed — but pre-normalize the rack too in that case.
```

---

## Data files

| File | Purpose |
|---|---|
| `data/sample_words_he.txt` | Small curated list (~30 common Hebrew words) used for tests and quick examples. Hand-edited; safe to depend on. |
| `data/hebrew_dict.txt` | Larger Hebrew dictionary (~10,000 entries, ~111 KB) copied manually into the repo. **Optional POC data** intended for a future dictionary-based validation task; **not yet wired into the matcher**. |

### Preprocessing note for `hebrew_dict.txt`

This file likely needs preprocessing before being used for anagram-style matching:

- **Filter out one-letter entries.** They produce noisy "matches" for almost any rack and are not useful for anagram validation.
- Consider also filtering: blank lines, comments, duplicate entries, and entries containing non-Hebrew characters.
- Decide on a normalization policy (niqqud removal, final-letter handling) consistent with `letters.py`.

Until that preprocessing step is implemented, treat `hebrew_dict.txt` as raw input — do not feed it directly into `can_form_word` over the full file.

## Design notes

- **Final letters** (ך ם ן ף ץ) are treated as distinct from their base forms by default. Pass pre-normalized strings if you need final-letter-agnostic matching.
- **Niqqud** is stripped before matching; it is preserved when `remove_niqqud_enabled=False`.
- **Wildcards** consume one Hebrew letter each; they do not match niqqud or whitespace.
- Scoring is intentionally trivial (1 pt / letter) and will be replaced in a future iteration.

---

## Web app (`web/`)

A static, client-side React + TypeScript + Vite app that wraps the same logic in a Hebrew, RTL, mobile-first UI. **Everything runs in the browser** — no backend, no API, no telemetry, no service calls. The dictionary is shipped as a plain text file under `web/public/`.

### Local development

```bash
cd web
npm install
npm run dev          # vite dev server with hot reload
npm run build        # produces web/dist/
npm run preview      # serves the production build locally
npm test             # vitest, runs the TS unit tests
```

The TS port of the Python logic lives under `web/src/lib/` (`hebrew.ts`, `matcher.ts`, `dictionary.ts`, `scoring.ts`) and has its own unit tests next to each module.

### Static build & GitHub Pages deployment

`vite.config.ts` sets `base: "./"` so the build's `index.html` references assets via relative paths (`./assets/...`). The same `dist/` therefore deploys cleanly whether the site is served at:

- a domain root (`https://example.com/`),
- a GitHub Pages user site (`https://<user>.github.io/`),
- a GitHub Pages project subpath (`https://<user>.github.io/<repo>/`),
- or a custom domain.

The dictionary is fetched at runtime via `${import.meta.env.BASE_URL}hebrew_dict.txt`, which Vite resolves relative to the same base.

**Manual GitHub Pages deploy (no GitHub Actions required):**

```bash
cd web
npm install
npm run build
# Push the contents of web/dist/ to the gh-pages branch:
git worktree add ../gh-pages-deploy gh-pages 2>/dev/null \
  || git worktree add -b gh-pages ../gh-pages-deploy
rsync -a --delete dist/ ../gh-pages-deploy/
cd ../gh-pages-deploy
git add -A && git commit -m "Deploy $(date +%F)" && git push -u origin gh-pages
```

Then in GitHub: **Settings → Pages → Source: Deploy from branch → `gh-pages` / root**. A GitHub Actions workflow can be added later if you want push-to-deploy; the current setup is intentionally CI-free to keep the POC simple.

### Web app architecture (one-line summary)

`App.tsx` fetches the dictionary on mount, preprocesses it (niqqud strip, optional final-letter collapse, one-letter filter, dedup), and on every keystroke filters by `canFormWord(rack, word)` and re-sorts. Components (`SearchForm`, `OptionsPanel`, `ResultsList`, `ResultCard`, `EmptyState`) are presentational; all state lives in `App`. No web worker, no router, no state-management library, no UI framework — plain React + plain CSS.

### Dictionary

- Source of truth: `data/hebrew_dict.txt`.
- The web build ships a **copy** at `web/public/hebrew_dict.txt`. **Do not edit the copy** — re-copy it from `data/` if the source changes.
- One-letter entries are filtered out by default during preprocessing, matching the Python policy.
- **Final-letter normalization defaults to ON in the web UI** (the toggle in the Options panel). This is a deliberate divergence from the Python default: the bundled dictionary was found to use base forms (`מ`, `נ`, …) at word ends instead of final forms (`ם`, `ן`, …), so without normalization a user typing "שלום" would match zero entries. The Python reference keeps the toggle off for code-level clarity. End users can still turn it off in the UI.

---

## Next step

Before introducing metaswarm, verify that a second agent (Gemini CLI or Codex CLI) can clone the repo, run `pytest`, make a small code change, and produce a passing test. See `.ai/validation-notes.md`.
