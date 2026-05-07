"""Word scoring — placeholder logic for the POC.

Scoring here is intentionally trivial: one point per Hebrew letter.  The
purpose is to exercise the scoring pipeline and validate that the agent
workflow reaches this module, not to implement a real Scrabble-style system.
A future iteration can introduce letter-frequency weights or positional bonuses.
"""

import unicodedata

# Hebrew letter block: U+05D0–U+05EA (alef–tav, including finals)
_HEBREW_LETTER_RANGE = range(0x05D0, 0x05EB)


def _is_hebrew_letter(ch: str) -> bool:
    return ord(ch) in _HEBREW_LETTER_RANGE


def score_word(word: str) -> int:
    """Return a score for *word* based on its Hebrew letter count.

    Each Hebrew letter (U+05D0–U+05EA) contributes 1 point.  Non-Hebrew
    characters (niqqud, punctuation, spaces) are ignored.

    This is placeholder scoring for the POC.

    Args:
        word: Hebrew word or string to score.

    Returns:
        Integer score ≥ 0.

    Raises:
        TypeError: If *word* is not a ``str``.
    """
    if not isinstance(word, str):
        raise TypeError(f"Expected str, got {type(word).__name__}")
    return sum(1 for ch in word if _is_hebrew_letter(ch))
