# Task: Initial project setup

## Status: complete

## Goal

Bootstrap the `metaswarm-hebrew-anagram-poc` Python project with enough working code and tests to serve as a stable baseline for multi-agent workflow validation.

## Deliverables

- [x] `src/hebrew_anagram/letters.py` — `remove_niqqud`, `normalize_final_letters`, `normalize_text`
- [x] `src/hebrew_anagram/matcher.py` — `can_form_word` with wildcard support
- [x] `src/hebrew_anagram/scoring.py` — `score_word` (placeholder, letter count)
- [x] `tests/test_letters.py`, `tests/test_matcher.py`, `tests/test_scoring.py`
- [x] `data/sample_words_he.txt` — ~30 common Hebrew words
- [x] `pyproject.toml` — editable install, pytest dev dep
- [x] `README.md`, `CLAUDE.md`, `AGENTS.md`

## Constraints

- Pure Python, no external dependencies
- No network, no database, no UI
- pytest only

## Completed by

Claude Code (initial agent), 2026-05-07
