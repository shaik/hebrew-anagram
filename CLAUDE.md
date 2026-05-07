# CLAUDE.md — Project instructions for Claude Code

## What this project is

A validation POC for testing **metaswarm / multi-agent coding workflows**. The goal is to exercise CLI-based agentic tooling (Claude Code, Gemini CLI, Codex CLI, metaswarm) — not to build a production Hebrew anagram app.

## Core rules

- **Keep it simple.** Readable, minimal, well-tested code is the goal.
- **Pure Python only** unless there is a documented, compelling reason for a dependency.
- **No external APIs, databases, web frameworks, UI, or network dependencies.**
- **Small, focused changes.** One concern per PR / commit.
- **Always add or update pytest tests** for any behavior change.
- **Always run `pytest` before summarizing completion.**

## Hebrew-specific care

- Preserve Hebrew Unicode handling throughout.
- Niqqud (U+0591–U+05C7) should be stripped via `remove_niqqud()`, not by ad-hoc regex.
- Final-letter normalization (ך→כ etc.) is **off by default** and must be explicitly requested.
- Document any assumption about Unicode normalization (NFC vs. NFD) in code comments.

## Code style

- Type hints on all public functions.
- Short, clear docstrings on public functions — explain *what* and *why*, not *how*.
- No unnecessary abstractions or premature generalization.
- Avoid comments that restate what the code already says clearly.

## Project layout

```
src/hebrew_anagram/   ← library source
tests/                ← pytest test files
data/                 ← sample word lists
.ai/                  ← agent task files
```

## Running the project

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
```
