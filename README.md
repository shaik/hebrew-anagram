# metaswarm-hebrew-anagram-poc

A minimal Python proof-of-concept for **validating metaswarm / multi-agent coding workflows**.

This is **not** a production Hebrew anagram application. Its purpose is to exercise CLI-based agentic workflows (Claude Code, Gemini CLI, Codex CLI, metaswarm) on a real but bounded problem — Hebrew text normalization and letter matching.

---

## What it does

| Module | Responsibility |
|---|---|
| `letters.py` | Niqqud removal, final-letter normalization, text normalization |
| `matcher.py` | Check whether a word can be formed from a letter pool (with wildcard support) |
| `scoring.py` | Placeholder word scoring (letter count) |

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
score_word("ירושלים")              # → 8
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

## Next step

Before introducing metaswarm, verify that a second agent (Gemini CLI or Codex CLI) can clone the repo, run `pytest`, make a small code change, and produce a passing test. See `.ai/validation-notes.md`.
