"""Hebrew text normalization utilities."""

import re
import unicodedata

# Unicode ranges
# Niqqud (vowel marks) and cantillation: U+0591–U+05C7
_NIQQUD_RE = re.compile(r"[֑-ׇ]")

# Map each Hebrew final letter to its non-final equivalent
_FINAL_TO_BASE: dict[str, str] = {
    "ך": "כ",  # ך → כ
    "ם": "מ",  # ם → מ
    "ן": "נ",  # ן → נ
    "ף": "פ",  # ף → פ
    "ץ": "צ",  # ץ → צ
}


def remove_niqqud(text: str) -> str:
    """Return *text* with all niqqud (vowel diacritics) removed.

    Strips Unicode code points U+0591–U+05C7 (Hebrew cantillation marks and
    niqqud). All other characters, including punctuation and Latin text, are
    preserved unchanged.
    """
    if not isinstance(text, str):
        raise TypeError(f"Expected str, got {type(text).__name__}")
    return _NIQQUD_RE.sub("", text)


def normalize_final_letters(text: str) -> str:
    """Replace Hebrew final-form letters with their standard equivalents.

    Maps ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ. Useful when comparing words without
    caring about positional letter variants.
    """
    if not isinstance(text, str):
        raise TypeError(f"Expected str, got {type(text).__name__}")
    for final, base in _FINAL_TO_BASE.items():
        text = text.replace(final, base)
    return text


def normalize_text(
    text: str,
    remove_niqqud_enabled: bool = True,
    normalize_finals: bool = False,
) -> str:
    """Normalize Hebrew (and mixed) text for comparison.

    Steps applied in order:
    1. Validate that *text* is a ``str``.
    2. Optionally remove niqqud (default: on).
    3. Optionally normalize final letters (default: off).
    4. Collapse runs of whitespace to a single space and strip leading/
       trailing whitespace.

    Punctuation and non-Hebrew characters are preserved.

    Args:
        text: Input string to normalize.
        remove_niqqud_enabled: Strip niqqud diacritics when ``True`` (default).
        normalize_finals: Map final-form letters to base form when ``True``.

    Returns:
        Normalized string.

    Raises:
        TypeError: If *text* is not a ``str``.
    """
    if not isinstance(text, str):
        raise TypeError(f"Expected str, got {type(text).__name__}")

    if remove_niqqud_enabled:
        text = remove_niqqud(text)

    if normalize_finals:
        text = normalize_final_letters(text)

    # Collapse repeated whitespace
    text = re.sub(r"\s+", " ", text).strip()

    return text
