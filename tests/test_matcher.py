"""Tests for hebrew_anagram.matcher."""

import pytest
from hebrew_anagram.matcher import can_form_word


class TestExactMatch:
    def test_exact_letters_match(self):
        assert can_form_word("שלום", "שלום") is True

    def test_extra_letters_in_rack(self):
        # rack must use ם (U+05DD final-mem) to match the ם in שלום
        assert can_form_word("שלוםבית", "שלום") is True

    def test_anagram_match(self):
        # Use a word with no final-form letters to avoid ם vs מ mismatch
        assert can_form_word("רפס", "ספר") is True

    def test_insufficient_letters(self):
        assert can_form_word("שלו", "שלום") is False

    def test_wrong_letters(self):
        assert can_form_word("אבגד", "שלום") is False

    def test_duplicate_letters_exact(self):
        assert can_form_word("ממ", "ממ") is True

    def test_duplicate_letters_insufficient(self):
        # Only one מ in rack, word needs two
        assert can_form_word("מלא", "ממ") is False


class TestEmptyInput:
    def test_empty_candidate_always_true(self):
        # An empty word can always be formed
        assert can_form_word("שלום", "") is True

    def test_empty_rack_nonempty_candidate(self):
        assert can_form_word("", "א") is False

    def test_both_empty(self):
        assert can_form_word("", "") is True


class TestWildcard:
    def test_single_wildcard_substitutes_one_letter(self):
        assert can_form_word("של?", "שלם") is True

    def test_wildcard_not_needed(self):
        assert can_form_word("שלם?", "שלם") is True

    def test_multiple_wildcards(self):
        assert can_form_word("??", "אב") is True

    def test_insufficient_wildcards(self):
        assert can_form_word("?", "אב") is False

    def test_custom_wildcard_char(self):
        assert can_form_word("של*", "שלם", wildcard="*") is True

    def test_wildcard_not_in_letter_pool(self):
        # ? consumed as wildcard, so rack has no letter for a second candidate char
        assert can_form_word("?", "אב") is False


class TestNiqqud:
    def test_niqqud_in_rack_ignored(self):
        # Rack letter has niqqud; candidate does not
        assert can_form_word("שָׁלוֹם", "שלום") is True

    def test_niqqud_in_candidate_ignored(self):
        assert can_form_word("שלום", "שָׁלוֹם") is True

    def test_niqqud_in_both(self):
        assert can_form_word("שָׁלוֹם", "שָׁלוֹם") is True


class TestFinalLetters:
    def test_final_kaf_not_equal_to_kaf_by_default(self):
        # Final-letter normalization is off; ך ≠ כ
        assert can_form_word("כ", "ך") is False

    def test_final_mem_not_equal_to_mem_by_default(self):
        assert can_form_word("מ", "ם") is False

    def test_pre_normalized_finals_match(self):
        # Caller pre-normalizes both sides
        from hebrew_anagram.letters import normalize_final_letters
        rack = normalize_final_letters("כ")
        word = normalize_final_letters("ך")
        assert can_form_word(rack, word) is True


class TestWhitespace:
    def test_whitespace_in_rack_ignored(self):
        # use ם (final-mem) to match the ם in שלום
        assert can_form_word("ש ל ו ם", "שלום") is True

    def test_tabs_and_newlines_in_rack_ignored(self):
        assert can_form_word("ש\tל\nו\rם", "שלום") is True


class TestTypeErrors:
    def test_letters_not_str(self):
        with pytest.raises(TypeError):
            can_form_word(123, "שלום")  # type: ignore[arg-type]

    def test_candidate_not_str(self):
        with pytest.raises(TypeError):
            can_form_word("שלום", None)  # type: ignore[arg-type]
