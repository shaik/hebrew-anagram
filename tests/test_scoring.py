"""Tests for hebrew_anagram.scoring."""

import pytest
from hebrew_anagram.scoring import score_word


class TestScoreWord:
    def test_simple_word(self):
        # שלום = 4 Hebrew letters
        assert score_word("שלום") == 4

    def test_single_letter(self):
        assert score_word("א") == 1

    def test_empty_string(self):
        assert score_word("") == 0

    def test_niqqud_not_counted(self):
        # Niqqud code-points are not in U+05D0–U+05EA range → not counted
        # שָׁלוֹם has 4 base letters + several niqqud marks
        assert score_word("שָׁלוֹם") == 4

    def test_punctuation_not_counted(self):
        assert score_word("שלום!") == 4

    def test_spaces_not_counted(self):
        assert score_word("שלום עולם") == 8

    def test_latin_chars_not_counted(self):
        assert score_word("abc") == 0

    def test_mixed_hebrew_and_latin(self):
        assert score_word("שלום hello") == 4

    def test_all_five_finals_counted(self):
        # ך ם ן ף ץ are each one Hebrew letter (U+05DA, 05DD, 05DF, 05E3, 05E5)
        assert score_word("ךםןףץ") == 5

    def test_longer_word(self):
        # ירושלים = 7 letters: י-ר-ו-ש-ל-י-ם
        assert score_word("ירושלים") == 7

    def test_type_error(self):
        with pytest.raises(TypeError):
            score_word(42)  # type: ignore[arg-type]

    def test_type_error_none(self):
        with pytest.raises(TypeError):
            score_word(None)  # type: ignore[arg-type]
