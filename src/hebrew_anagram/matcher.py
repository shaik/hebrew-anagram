"""Letter-availability matching for Hebrew anagram checking."""

from .letters import remove_niqqud


def can_form_word(
    letters: str,
    candidate: str,
    wildcard: str = "?",
) -> bool:
    """Return whether *candidate* can be formed from the available *letters*.

    Rules:
    - Niqqud is stripped from both *letters* and *candidate* before matching.
    - Final-letter normalization is **not** applied by default; ך and כ are
      treated as distinct letters. Pass pre-normalized strings if you need
      final-letter-agnostic matching.
    - Whitespace inside *letters* is ignored (e.g. a rack stored as "א ב ג").
    - Each character in *wildcard* (default ``"?"``) can stand in for any
      single Hebrew letter from *candidate* not covered by a real letter.
    - Inputs are never mutated.

    Args:
        letters: Pool of available letters (the "rack").
        candidate: Word to check.
        wildcard: Character(s) treated as universal substitutes.

    Returns:
        ``True`` if *candidate* can be formed, ``False`` otherwise.

    Raises:
        TypeError: If *letters* or *candidate* is not a ``str``.
    """
    if not isinstance(letters, str):
        raise TypeError(f"letters must be str, got {type(letters).__name__}")
    if not isinstance(candidate, str):
        raise TypeError(f"candidate must be str, got {type(candidate).__name__}")

    # Normalise: strip niqqud, drop whitespace from the rack
    rack_clean = remove_niqqud(letters).replace(" ", "")
    word_clean = remove_niqqud(candidate)

    # Build mutable frequency maps
    rack_counts: dict[str, int] = {}
    for ch in rack_clean:
        rack_counts[ch] = rack_counts.get(ch, 0) + 1

    wildcards_available = rack_counts.pop(wildcard, 0)

    wildcards_used = 0
    for ch in word_clean:
        if rack_counts.get(ch, 0) > 0:
            rack_counts[ch] -= 1
        elif wildcards_used < wildcards_available:
            wildcards_used += 1
        else:
            return False

    return True
