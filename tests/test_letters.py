"""Tests for hebrew_anagram.letters."""

import pytest
from hebrew_anagram.letters import (
    normalize_final_letters,
    normalize_text,
    remove_niqqud,
)


class TestRemoveNiqqud:
    def test_plain_text_unchanged(self):
        assert remove_niqqud("שלום") == "שלום"

    def test_removes_vowel_marks(self):
        # שָׁלוֹם with niqqud → שלום without
        assert remove_niqqud("שָׁלוֹם") == "שלום"

    def test_mixed_hebrew_and_latin(self):
        result = remove_niqqud("הֵלּוֹ world")
        assert "world" in result
        assert "ֵ" not in result  # tsere removed

    def test_empty_string(self):
        assert remove_niqqud("") == ""

    def test_punctuation_preserved(self):
        assert remove_niqqud("שלום, עולם!") == "שלום, עולם!"

    def test_type_error_on_non_string(self):
        with pytest.raises(TypeError):
            remove_niqqud(123)  # type: ignore[arg-type]

    def test_type_error_on_none(self):
        with pytest.raises(TypeError):
            remove_niqqud(None)  # type: ignore[arg-type]


class TestNormalizeFinalLetters:
    def test_final_kaf(self):
        assert normalize_final_letters("מלך") == "מלכ"

    def test_final_mem(self):
        assert normalize_final_letters("עולם") == "עולמ"

    def test_final_nun(self):
        assert normalize_final_letters("גן") == "גנ"

    def test_final_pe(self):
        assert normalize_final_letters("אף") == "אפ"

    def test_final_tsadi(self):
        assert normalize_final_letters("ארץ") == "ארצ"

    def test_no_finals_unchanged(self):
        assert normalize_final_letters("שלום") == "שלומ"  # ם → מ

    def test_plain_word_no_finals(self):
        assert normalize_final_letters("בית") == "בית"

    def test_empty_string(self):
        assert normalize_final_letters("") == ""

    def test_type_error(self):
        with pytest.raises(TypeError):
            normalize_final_letters(42)  # type: ignore[arg-type]


class TestNormalizeText:
    def test_removes_niqqud_by_default(self):
        assert normalize_text("שָׁלוֹם") == "שלום"

    def test_keeps_niqqud_when_disabled(self):
        text = "שָׁלוֹם"
        result = normalize_text(text, remove_niqqud_enabled=False)
        assert result == text

    def test_collapses_whitespace(self):
        assert normalize_text("שלום   עולם") == "שלום עולם"

    def test_strips_leading_trailing_whitespace(self):
        assert normalize_text("  שלום  ") == "שלום"

    def test_normalize_finals_off_by_default(self):
        # ם stays ם when normalize_finals=False
        assert normalize_text("עולם") == "עולם"

    def test_normalize_finals_on(self):
        assert normalize_text("עולם", normalize_finals=True) == "עולמ"

    def test_preserves_punctuation(self):
        assert normalize_text("שלום, עולם!") == "שלום, עולם!"

    def test_empty_string(self):
        assert normalize_text("") == ""

    def test_type_error(self):
        with pytest.raises(TypeError):
            normalize_text(None)  # type: ignore[arg-type]

    def test_type_error_list(self):
        with pytest.raises(TypeError):
            normalize_text(["שלום"])  # type: ignore[arg-type]
