# Session handoff — pausing point

Last session ended: 2026-05-07.

This file is transient session state for the next Claude Code session. It is *not* a stable design doc — see `.ai/validation-notes.md` and `CLAUDE.md` / `AGENTS.md` for those. Once the next task starts, this file may be deleted or rewritten.

---

## 1. Current project state

| Item | Value |
|---|---|
| Repo | `/Users/shaik/projects/metaswarm-hebrew-anagram-poc` |
| Branch | `main` |
| HEAD | `e7883e8` — *Initialize metaswarm configuration* |
| Working tree | should be clean |
| Plain tests | `pytest` — 64 passed |
| Coverage gate | `pytest --cov --cov-fail-under=100` — **100.00% on 216 statements**, threshold met |

If the next session finds the tree dirty or HEAD different, **stop and reconcile before starting work**.

---

## 2. What has been completed

- **Baseline Hebrew anagram POC** — `letters.py` (niqqud + final-letter normalization), `matcher.py` (`can_form_word` with `?` wildcard), `scoring.py` (placeholder letter count). 64 pytest tests, all passing.
- **`scripts/validate_agent_setup.py`** — local diagnostic for environment, repo, data, agent CLIs, metaswarm prereqs. Writes timestamped reports to `.ai/validation-runs/`.
- **`scripts/setup_metaswarm.py`** — preflight + optional `--init` for metaswarm. Was used in `--check-only` mode only; the actual metaswarm install/init was done via the Claude `/metaswarm:setup` slash command, not via this script.
- **Metaswarm initialized** via `/metaswarm:setup` (plugin v0.11.0). Generated:
  - `.metaswarm/project-profile.json`, `.metaswarm/external-tools.yaml`
  - `.coverage-thresholds.json` (100%)
  - 7 command shims in `.claude/commands/` (start-task, start, prime, review-design, self-reflect, pr-shepherd, brainstorm)
  - `.beads/knowledge/` — 7 jsonl seed files
  - `bin/` — 3 shell utilities (`estimate-cost.sh`, `pr-comments-check.sh`, `pr-comments-filter.sh`)
  - `scripts/beads-fetch-pr-comments.ts`, `scripts/beads-fetch-conversation-history.ts` (Node, optional)
  - `SERVICE-INVENTORY.md`, `.env.example`
  - `.gitignore` extended with node/coverage/env/BEADS rules
- **`pyproject.toml`** — added `pytest-cov>=4` to `[project.optional-dependencies] dev`. 100% coverage gate verified.
- **Agent CLIs verified** — `claude` 2.1.132, `gemini` 0.39.0, `codex` 0.129.0.
- **Codex auth** — works via ChatGPT login (`codex login status` → "Logged in using ChatGPT"). `OPENAI_API_KEY` is also set in this shell as a fallback.
- **Gemini auth** — `GEMINI_API_KEY` is *not* set; the CLI relies on Google login (per the yaml comment, this is supported).
- **External tools health** — both adapters `enabled: true`; routing `cheapest-available`; escalation `codex → gemini → claude`; budget $2/task, $20/session.
- **`bin/external-tools-verify.sh`** — **intentionally deleted**. It was a metaswarm-plugin self-test (it expected `skills/external-tools/adapters/*.sh` inside the working directory) and produced 12 false FAILs when run from the project root. Do not restore.

---

## 3. Important decisions (do not relitigate without reason)

- This stays a **validation POC**, not a production Hebrew anagram app.
- **No** external APIs, databases, UI frameworks, cloud services, or network dependencies.
- **External AI tools enabled** (Codex + Gemini routed via metaswarm).
- **CI declined** for now (no `.github/workflows/ci.yml`). Easy to add later.
- **Git hooks declined** for now.
- **Coverage threshold = 100%**. Don't lower it without a documented reason.
- **Dictionary preprocessing default**: filter one-letter words. The current `data/hebrew_dict.txt` has 6 such entries; they're noise for anagram matching. See `.ai/validation-notes.md` for the broader preprocessing policy.
- **Final-letter normalization is off by default** in matcher. The Hebrew final-form code points (ם U+05DD vs מ U+05DE, etc.) are *distinct* — this caught us during initial test authoring. Keep this in mind when reading or writing Hebrew test strings.

---

## 4. Next planned task

**Add `src/hebrew_anagram/dictionary.py`** — first real metaswarm-driven validation task. Implements word-list loading + preprocessing, with tests that use `tmp_path` and never touch `data/hebrew_dict.txt`.

Suggested entry point: `/start-task` — copy the prompt below into it.

---

## 5. Exact next-task prompt (paste into `/start-task`)

```
Task: Add dictionary loading and preprocessing.

Create src/hebrew_anagram/dictionary.py exposing one public function:

    def load_words(
        path: str | Path,
        *,
        min_length: int = 2,
        drop_non_hebrew: bool = True,
        normalize_finals: bool = False,
        strip_niqqud: bool = True,
    ) -> list[str]:
        """Load and preprocess a Hebrew word list from disk."""

Behavior:
- Open `path` as UTF-8.
- Skip blank lines and comment lines (lines whose first non-whitespace
  character is `#`).
- Strip leading/trailing whitespace from each remaining line.
- If `strip_niqqud=True` (default), apply `letters.remove_niqqud`.
- If `normalize_finals=True`, apply `letters.normalize_final_letters`.
  This is off by default to match project policy (final letters are
  distinct code points by default).
- If `drop_non_hebrew=True` (default), drop any entry containing a
  character outside the Hebrew block U+0590–U+05FF. Whitespace inside
  an entry has already been stripped, so this is purely a per-character
  block check.
- If `len(word) < min_length`, drop the entry. The default `min_length=2`
  encodes the agreed policy of filtering one-letter words.
- Deduplicate while preserving first-seen order.
- Return list[str].
- Raise TypeError if `path` is not str or pathlib.Path.
- Let pathlib raise FileNotFoundError naturally if the file is missing.
- Never mutate the source file. The function must only read.

Wire-up:
- Export `load_words` from src/hebrew_anagram/__init__.py.

Tests (tests/test_dictionary.py — new file):
- All tests must construct word-list files via the pytest `tmp_path`
  fixture. NEVER read data/hebrew_dict.txt or data/sample_words_he.txt
  from this test module.
- Cover at minimum:
    * basic load returns expected words with niqqud stripped
    * one-letter words filtered by default
    * one-letter words kept when min_length=1
    * blank lines skipped
    * lines starting with `#` skipped (with and without leading spaces)
    * non-Hebrew entries dropped by default
    * non-Hebrew entries kept when drop_non_hebrew=False
    * final-letter normalization off by default; on when explicitly requested
    * deduplication preserves first-seen order
    * TypeError raised for non-str/Path input (e.g., int, list, None)
    * FileNotFoundError raised for missing path
    * source file is byte-identical before and after the call

Constraints:
- Pure Python, stdlib only. No new third-party dependencies.
- Type hints on the public function. One-line docstring (not a manual).
- Coverage gate must still pass:  pytest --cov --cov-fail-under=100
- Do NOT modify: data/, src/hebrew_anagram/letters.py, matcher.py,
  scoring.py, any test file other than the new tests/test_dictionary.py,
  pyproject.toml, scripts/, .metaswarm/, .claude/, AGENTS.md, CLAUDE.md.
- Do NOT integrate the dictionary into the matcher in this task. That
  is a separate follow-up.

Definition of done:
- New file src/hebrew_anagram/dictionary.py
- New file tests/test_dictionary.py
- One-line edit to src/hebrew_anagram/__init__.py adding the export
- pytest passes
- pytest --cov --cov-fail-under=100 passes
- git diff shows only the three files above changed
```

---

## 6. Before resuming

Run, in order:

```bash
git status
pytest --cov --cov-fail-under=100
```

If the working tree is dirty or coverage is below 100%, stop and reconcile before touching the next task.

Optionally, also run:

```bash
# Confirm Codex / Gemini still reachable + authenticated
/metaswarm:external-tools-health
```

If something has drifted (CLI removed, login expired, package version changed), fix it before invoking `/start-task`.

---

## Pointers

- Stable docs: `CLAUDE.md`, `AGENTS.md`, `.ai/validation-notes.md`, `README.md`
- Diagnostic scripts: `scripts/validate_agent_setup.py`, `scripts/setup_metaswarm.py`
- Past run reports: `.ai/validation-runs/` (gitignored)
- Memory index: `.claude/projects/-Users-shaik-projects-metaswarm-hebrew-anagram-poc/memory/MEMORY.md` (outside the repo)
