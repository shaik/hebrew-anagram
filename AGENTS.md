# AGENTS.md — Instructions for any coding agent working in this repo

This file mirrors CLAUDE.md but is tool-neutral.

## What this project is

A validation POC for **metaswarm / multi-agent coding workflows**. The repository exercises agentic CLI tools on a bounded, real problem (Hebrew text normalization and anagram matching) to validate session management, test execution, git workflow, and cross-agent handoffs.

## Core rules

1. **Keep it simple.** Prefer the smallest correct solution.
2. **Pure Python only.** Do not introduce libraries not already in `pyproject.toml`.
3. **No external services.** No HTTP calls, databases, cloud SDKs, or UI frameworks.
4. **Focused changes.** One logical concern per commit.
5. **Test everything.** Add or update pytest tests for every behavior change.
6. **Run tests before reporting done.** Execute `pytest` and confirm all tests pass.

## Hebrew Unicode rules

- Niqqud diacritics live at U+0591–U+05C7; strip them with `remove_niqqud()`.
- Final letters (ך ם ן ף ץ) are distinct from base forms by default.
- Do not silently apply final-letter normalization; make it opt-in.
- Validate that input is `str`; raise `TypeError` otherwise.

## Repository layout

```
src/hebrew_anagram/   ← importable library (letters, matcher, scoring)
tests/                ← pytest suite (mirrors src modules)
data/                 ← sample Hebrew word list
.ai/                  ← agent task and validation notes
CLAUDE.md             ← Claude Code-specific instructions
AGENTS.md             ← this file
README.md             ← human-readable docs and usage examples
pyproject.toml        ← build config; no version pinning of library deps
```

## Setup commands

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
pytest
```

## Assumptions to preserve

- `can_form_word` does **not** normalize final letters — document if you change this.
- `score_word` is placeholder (letter count); label clearly if you extend it.
- `normalize_text` collapses whitespace but preserves punctuation.

## Handoff checklist

Before passing work to another agent or human:
- [ ] `pytest` passes with zero failures
- [ ] New/changed code has type hints and a docstring
- [ ] `data/sample_words_he.txt` is not modified unless the task explicitly requires it
- [ ] No new dependencies added to `pyproject.toml` without justification
