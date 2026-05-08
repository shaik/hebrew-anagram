"""Dictionary loading + preprocessing for Hebrew word lists."""

from __future__ import annotations

from pathlib import Path

from .letters import normalize_final_letters, remove_niqqud
from .matcher import can_form_word

_HEBREW_BLOCK_START = 0x0590
_HEBREW_BLOCK_END = 0x05FF


def _is_hebrew_only(s: str) -> bool:
    return all(_HEBREW_BLOCK_START <= ord(c) <= _HEBREW_BLOCK_END for c in s)


def load_words(
    path: str | Path,
    *,
    min_length: int = 2,
    drop_non_hebrew: bool = True,
    normalize_finals: bool = False,
    strip_niqqud: bool = True,
) -> list[str]:
    """Load and preprocess a Hebrew word list from disk.

    Reads *path* as UTF-8, applies the configured preprocessing steps to each
    line, and returns the deduplicated list of surviving words in first-seen
    order. The source file is never modified.
    """
    if not isinstance(path, (str, Path)):
        raise TypeError(f"path must be str or Path, got {type(path).__name__}")

    text = Path(path).read_text(encoding="utf-8")

    seen: set[str] = set()
    out: list[str] = []

    for line in text.splitlines():
        if not line.strip():
            continue
        if line.lstrip().startswith("#"):
            continue

        word = line.strip()
        if strip_niqqud:
            word = remove_niqqud(word)
        if normalize_finals:
            word = normalize_final_letters(word)

        if drop_non_hebrew and not _is_hebrew_only(word):
            continue
        if len(word) < min_length:
            continue
        if word in seen:
            continue

        seen.add(word)
        out.append(word)

    return out


def find_matching_words(
    letters: str,
    dictionary_path: str | Path,
    *,
    min_length: int = 2,
    normalize_finals: bool = False,
    wildcard: str = "?",
) -> list[str]:
    """Return dictionary words that can be formed from *letters*.

    Loads ``dictionary_path`` via :func:`load_words` (forwarding ``min_length``
    and ``normalize_finals``), then keeps every loaded word for which
    :func:`hebrew_anagram.matcher.can_form_word` returns ``True`` against
    *letters*. Result order matches the load order from :func:`load_words`.

    The *letters* string is passed through to ``can_form_word`` unchanged —
    final-letter normalization is **not** applied to it. When using
    ``normalize_finals=True``, callers should pre-normalize *letters* if they
    want final-form letters in the rack to match base forms in the loaded
    dictionary.
    """
    words = load_words(
        dictionary_path,
        min_length=min_length,
        normalize_finals=normalize_finals,
    )
    return [w for w in words if can_form_word(letters, w, wildcard=wildcard)]
