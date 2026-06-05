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

## The UI — "שולחן המשחק" (the game table)

The entire interface is **one input box and one button**. You type letters; every press of **"הצירוף הבא"** reveals a random exact-anagram combination of those letters, rendered as Scrabble-style letter tiles (pure CSS — no point values). Because every answer uses exactly the typed letters, the tiles physically **scatter mid-air and resettle** into the new word(s) on each press (FLIP + Web Animations API, no animation library; `prefers-reduced-motion` is respected).

Design system: dark felt-green table (layered gradients + SVG-turbulence grain), ivory beveled tiles with embossed letters, a walnut input rack, one brass button. Hebrew fonts are **vendored locally** (`web/src/assets/fonts/` — Suez One for tiles/headings, Assistant for UI text, both OFL) so the app stays offline-capable after first load.

`App.tsx` fetches the dictionary on mount, preprocesses it (niqqud strip, final-letter collapse, one-letter filter, dedup), runs `findMultiWordAnagrams` (with `minWords: 1`, identity result filtered out) when the letters change, shuffles the result order, and steps through it on each press. `components/TileBoard.tsx` is the only presentational component. The typed letters mirror to the URL as `?q=` so any state is shareable by copying the address. No web worker, no router, no state-management library, no UI framework — plain React + plain CSS.

## Design notes

- **Final letters** (ך ם ן ף ץ) are treated as distinct from their base forms by default in the lib functions; normalization is opt-in. The UI applies it **always** (see Dictionary below).
- **Niqqud** (U+0591–U+05C7) is stripped before matching.
- Non-Hebrew input characters are silently dropped; `?` wildcards are not supported in the anagram engine the UI uses.
- Scoring (`lib/scoring.ts`) is intentionally trivial (1 pt / letter) and currently has no UI.

## Dictionary

- The bundled dictionary is `web/public/hebrew_dict.txt` (~10,000 entries, ~111 KB). It is the only copy in the repo.
- One-letter entries are filtered out by default during preprocessing.
- **Final-letter normalization is always on**: the bundled dictionary uses base forms (`מ`, `נ`, …) at word ends instead of final forms (`ם`, `ן`, …), so without normalization a user typing "שלום" would match zero entries. The previous UI exposed this as a toggle; the redesigned UI does not.

## Display: final-letter restoration

Internal matching keeps Hebrew words in base form (e.g. `שלומ`, `מלכ`) so the bundled dictionary stays searchable. For display, `restoreFinalLettersForDisplay` (`web/src/lib/hebrew.ts`) rewrites the **last** letter of each Hebrew word to its final form when one exists (`כ→ך`, `מ→ם`, `נ→ן`, `פ→ף`, `צ→ץ`). Interior letters are left alone, whitespace and punctuation are preserved, and words that already have correct final letters pass through unchanged. The function is applied per word of every revealed combination, so the board always renders natural Hebrew — a tile typed as `ם` may render as `מ` mid-word and back again as it moves between arrangements.

## The anagram engine

`findMultiWordAnagrams` (`web/src/lib/multiwordAnagrams.ts`) finds combinations of dictionary words whose letters together exactly equal the input:

- Algorithm: input is normalized (niqqud stripped, whitespace removed, final-letter-collapsed), then a depth-first search with non-decreasing candidate index walks the preprocessed dictionary up to depth 3. A combination is reported only when the remaining letter multiset is empty. The non-decreasing-index rule rules out permutation duplicates by construction.
- The UI passes `minWords: 1`, so single-word anagrams count; the identity result (the input spelled back unchanged) is filtered out.
- Repetition: the same word may appear more than once in a combination if the input letters allow it.
- Result cap: **200 combinations** (`MULTI_WORD_DEFAULT_MAX_RESULTS`). Search returns early once the cap is reached, so worst-case time stays bounded for adversarial inputs.
- Spaces: whitespace in the input is stripped before matching, so `"שי כפיר"` and `"שיכפיר"` produce the same combinations.
- Input-length safeguard: searches over more than **14 letters** (post-niqqud-strip, post-whitespace-strip) short-circuit and show a Hebrew note. The DFS is bounded by candidate-count³; 14 covers natural Hebrew phrases like `שי כפיר` or `ירושלים` while keeping the main thread responsive.
- All computation runs in the browser. There is no Web Worker; the result cap + early termination + input-length cap keep typical UX snappy without one.

Unit tests (`web/src/lib/multiwordAnagrams.test.ts`) cover exact consumption, 2- and 3-word combinations, partial-match rejection, spaces in input, wildcard disable, dictionary-order stability, repeated-word combos, and the result cap.

## Library modules without UI

The previous multi-mode UI (single-word rack search, required "fixed" word, crossword pattern search, sorting/scoring options) was replaced by the single next-match flow. Its engine code is still in the repo, fully tested, in case a mode returns:

- `lib/matcher.ts` + `lib/dictionary.ts::findMatchingWords` — single-word rack matching with `?` wildcard.
- `lib/multiwordAnagrams.ts::isRequiredWordSatisfiable` + the `requiredWord` option — fixed-word constrained combinations.
- `lib/patternSearch.ts` — crossword/positional pattern search (exact length, cap 500).
- `lib/scoring.ts` — placeholder 1-pt-per-letter scoring.
