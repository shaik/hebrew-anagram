# AGENTS.md — Instructions for any coding agent working in this repo

This file mirrors CLAUDE.md but is tool-neutral.

## What this project is

A validation POC for **metaswarm / multi-agent coding workflows**. The repository exercises agentic CLI tools on a bounded, real problem (Hebrew text normalization and anagram matching) to validate session management, test execution, git workflow, and cross-agent handoffs.

The implementation is a single static, client-side web app under `web/` (React 18 + TypeScript + Vite). There is no backend. An earlier Python reference implementation was removed; `web/src/lib/` is authoritative.

## Core rules

1. **Keep it simple.** Prefer the smallest correct solution.
2. **No new runtime dependencies** without a documented reason — currently just React.
3. **No external services.** No HTTP calls (beyond fetching the bundled dictionary), databases, cloud SDKs, or UI frameworks.
4. **Focused changes.** One logical concern per commit.
5. **Test everything.** Add or update vitest tests for every behavior change.
6. **Run tests before reporting done.** Execute `npm test` from `web/` and confirm all tests pass.
7. **Bump `APP_VERSION`** in `web/src/strings.tsx` by +0.01 for every code-changing task.

## Hebrew Unicode rules

- Niqqud diacritics live at U+0591–U+05C7; strip them with `removeNiqqud()` (`web/src/lib/hebrew.ts`).
- Final letters (ך ם ן ף ץ) are distinct from base forms by default in the lib functions.
- Do not silently apply final-letter normalization in the lib; it is opt-in. (The UI opts in by default because the bundled dictionary uses base forms at word ends.)

## Repository layout

```
web/                  ← React + TS + Vite static site (own package.json)
  src/lib/            ← core logic + co-located *.test.ts
  src/components/     ← presentational React components
  public/             ← static assets including the bundled dictionary
.ai/                  ← agent task and validation notes
CLAUDE.md             ← Claude Code-specific instructions
AGENTS.md             ← this file
README.md             ← human-readable docs and usage examples
```

## Setup commands

```bash
cd web
npm install
npm test         # vitest, one shot
npm run dev      # local dev server
npm run build    # production build → web/dist/
```

## Assumptions to preserve

- `canFormWord` does **not** normalize final letters — document if you change this.
- `scoreWord` is placeholder (letter count); label clearly if you extend it.
- `web/public/hebrew_dict.txt` is the only copy of the dictionary — do not regenerate or reorder it unless the task explicitly requires it.

## Handoff checklist

Before passing work to another agent or human:
- [ ] `npm test` (from `web/`) passes with zero failures
- [ ] New/changed exports have explicit types and a short JSDoc
- [ ] `web/public/hebrew_dict.txt` is not modified unless the task explicitly requires it
- [ ] No new dependencies added to `web/package.json` without justification
