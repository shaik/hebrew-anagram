# metaswarm-hebrew-anagram-poc

A minimal proof-of-concept for **validating metaswarm / multi-agent coding workflows**.

This is **not** a production Hebrew anagram application. Its purpose is to exercise CLI-based agentic workflows (Claude Code, Gemini CLI, Codex CLI, metaswarm) on a real but bounded problem — Hebrew text normalization and letter matching.

The implementation is a static, client-side React + TypeScript + Vite app under `web/` that ships as static files suitable for GitHub Pages. **Everything runs in the browser** — no backend, no API, no database, no telemetry. The Hebrew dictionary is shipped as a plain text file under `web/public/`.

> An earlier pure-Python reference implementation (`src/hebrew_anagram/` + pytest suite) was removed; the TS code under `web/src/lib/` is now the sole, authoritative implementation.

---

## Local development

```bash
cd web
npm install
npm run dev          # vite dev server with hot reload
npm run build        # produces web/dist/
npm run preview      # serves the production build locally
npm test             # vitest, runs the unit tests
```

The core logic lives under `web/src/lib/` (`hebrew.ts`, `matcher.ts`, `dictionary.ts`, `scoring.ts`, `multiwordAnagrams.ts`, `patternSearch.ts`) and has its own unit tests next to each module.

Note: the built app cannot be opened directly via `file://` — browsers block ES-module scripts and `fetch()` on the file protocol. Serve `dist/` over HTTP (`npm run preview` or any static server).

---

## Static build & GitHub Pages deployment

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

---

## Architecture (one-line summary)

`App.tsx` fetches the dictionary on mount, preprocesses it (niqqud strip, optional final-letter collapse, one-letter filter, dedup), and on every keystroke filters by `canFormWord(rack, word)` and re-sorts. Components (`SearchForm`, `OptionsPanel`, `ResultsList`, `ResultCard`, `EmptyState`) are presentational; all state lives in `App`. No web worker, no router, no state-management library, no UI framework — plain React + plain CSS.

## Design notes

- **Final letters** (ך ם ן ף ץ) are treated as distinct from their base forms by default in the lib functions; normalization is opt-in.
- **Niqqud** (U+0591–U+05C7) is stripped before matching.
- **Wildcards** (`?`) consume one Hebrew letter each; they do not match niqqud or whitespace.
- Scoring is intentionally trivial (1 pt / letter) and will be replaced in a future iteration.

## Dictionary

- The bundled dictionary is `web/public/hebrew_dict.txt` (~10,000 entries, ~111 KB). It is the only copy in the repo.
- One-letter entries are filtered out by default during preprocessing.
- **Final-letter normalization defaults to ON in the UI** (the toggle in the Options panel): the bundled dictionary uses base forms (`מ`, `נ`, …) at word ends instead of final forms (`ם`, `ן`, …), so without normalization a user typing "שלום" would match zero entries. Users can still turn it off in the UI.

## Display: final-letter restoration

Internal matching keeps Hebrew words in base form (e.g. `שלומ`, `מלכ`) so the bundled dictionary stays searchable. For display, `restoreFinalLettersForDisplay` (`web/src/lib/hebrew.ts`) rewrites the **last** letter of each Hebrew word to its final form when one exists (`כ→ך`, `מ→ם`, `נ→ן`, `פ→ף`, `צ→ץ`). Interior letters are left alone, whitespace and punctuation are preserved, and words that already have correct final letters pass through unchanged. The function is applied to every result word in both single-word and multi-word modes, so the UI always renders natural Hebrew.

## Multi-word exact anagrams

The app supports a second mode that finds combinations of 2–3 dictionary words whose letters together exactly equal the input:

- Toggle: **"אנגרמות מרובות מילים"** in the Options panel.
- Algorithm: input is normalized (niqqud stripped, whitespace removed, optionally final-letter-collapsed), then a depth-first search with non-decreasing candidate index walks the preprocessed dictionary up to depth 3. A combination is reported only when the remaining letter multiset is empty. The non-decreasing-index rule rules out permutation duplicates by construction.
- Repetition: the same word may appear more than once in a combination if the input letters allow it.
- Result cap: **200 combinations** (`MULTI_WORD_DEFAULT_MAX_RESULTS` in `web/src/lib/multiwordAnagrams.ts`). Search returns early once the cap is reached, so worst-case time stays bounded for adversarial inputs.
- Spaces: whitespace in the input is stripped before matching, so `"שי כפיר"` and `"שיכפיר"` produce the same combinations.
- Wildcard: multi-word search **does not support `?`** — exact letter consumption with wildcards is intentionally out of scope. When the input contains a `?`, the UI shows a Hebrew note instead of partial results, and suggests removing the `?` or switching back to single-word mode.
- Input-length safeguard: searches over more than **14 letters** (post-niqqud-strip, post-whitespace-strip) short-circuit and show a Hebrew note. The DFS is bounded by candidate-count³, which can grow uncomfortably with very long inputs; 14 covers natural Hebrew phrases like `שי כפיר` or `ירושלים` while keeping the main thread responsive.
- All computation runs in the browser. There is no Web Worker; the result cap + early termination + input-length cap keep typical UX snappy without one.

Unit tests (`web/src/lib/multiwordAnagrams.test.ts`) cover exact consumption, 2- and 3-word combinations, partial-match rejection, spaces in input, wildcard disable, dictionary-order stability, repeated-word combos, and the result cap.

### Required ("fixed") word

In multi-word mode the user can supply an optional **"מילה קבועה"** that every returned combination must include. The fixed word is treated as one of the (up to 3) words, so with `maxWords=3` the search adds up to **2 additional** dictionary words. The fixed word appears exactly once per combination — it is excluded from the candidate pool during the additional-word search.

If the fixed word's letters are not a subset of the input, the UI surfaces a Hebrew error (`המילה הקבועה אינה מורכבת מהאותיות שהוזנו`) and no search runs. An empty fixed word disables the constraint entirely (back to the existing behavior).

The implementation lives next to the unconstrained search in `multiwordAnagrams.ts`. A small helper `isRequiredWordSatisfiable(requiredWord, input)` is exported for UI gating.

## Crossword / pattern search

The third mode, **"תבנית תשבץ"**, finds dictionary words that match a positional pattern:

- Input is one pattern string. Hebrew letters in the pattern are *fixed* positions; any non-Hebrew character (`?`, `.`, `*`, digits, ASCII letters, punctuation) is a *wildcard* for one letter.
- Pattern length is measured **after** whitespace and niqqud are stripped — paste-friendly on mobile, where stray characters often sneak in.
- Match length is **exact**: a 5-character cleaned pattern only matches 5-character dictionary words.
- Final-letter normalization respects the same global toggle as the other modes.
- Result cap: **500 matches** (`PATTERN_DEFAULT_MAX_RESULTS` in `web/src/lib/patternSearch.ts`).

Examples (with `normalizeFinals` on, matching the bundled dictionary):
- `??גד?` matches every 5-letter word that has `ג` at index 2 and `ד` at index 3.
- `?א??ב??צ` matches 8-letter words with `א` at 1, `ב` at 4, `צ` at 7.

Unit tests (`web/src/lib/patternSearch.test.ts`) cover fixed letters, every wildcard variant, mixed wildcards, length-mismatch rejection, whitespace and niqqud handling, the final-letter toggle, empty patterns, and the result cap.
