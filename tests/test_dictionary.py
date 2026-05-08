"""Tests for hebrew_anagram.dictionary."""

from pathlib import Path

import pytest

from hebrew_anagram.dictionary import find_matching_words, load_words


def _write(tmp_path: Path, content: str, name: str = "words.txt") -> Path:
    p = tmp_path / name
    p.write_text(content, encoding="utf-8")
    return p


class TestBasicLoad:
    def test_basic_load_strips_niqqud(self, tmp_path: Path):
        # שָׁלוֹם → שלום, עוֹלָם → עולם
        p = _write(tmp_path, "שָׁלוֹם\nעוֹלָם\n")
        assert load_words(p) == ["שלום", "עולם"]

    def test_accepts_str_path(self, tmp_path: Path):
        p = _write(tmp_path, "שלום\n")
        assert load_words(str(p)) == ["שלום"]

    def test_returns_list(self, tmp_path: Path):
        p = _write(tmp_path, "שלום\n")
        assert isinstance(load_words(p), list)


class TestMinLength:
    def test_one_letter_filtered_by_default(self, tmp_path: Path):
        p = _write(tmp_path, "א\nשלום\nב\nספר\n")
        assert load_words(p) == ["שלום", "ספר"]

    def test_one_letter_kept_when_min_length_one(self, tmp_path: Path):
        p = _write(tmp_path, "א\nשלום\n")
        assert load_words(p, min_length=1) == ["א", "שלום"]

    def test_higher_min_length(self, tmp_path: Path):
        p = _write(tmp_path, "אב\nשלום\nספר\n")
        # min_length=4 keeps only שלום
        assert load_words(p, min_length=4) == ["שלום"]


class TestBlankAndComments:
    def test_blank_lines_skipped(self, tmp_path: Path):
        p = _write(tmp_path, "שלום\n\n\nעולם\n   \n")
        assert load_words(p) == ["שלום", "עולם"]

    def test_comment_line_skipped(self, tmp_path: Path):
        p = _write(tmp_path, "# header comment\nשלום\nעולם\n")
        assert load_words(p) == ["שלום", "עולם"]

    def test_indented_comment_line_skipped(self, tmp_path: Path):
        p = _write(tmp_path, "שלום\n   # indented\n\t# tabbed\nעולם\n")
        assert load_words(p) == ["שלום", "עולם"]


class TestNonHebrew:
    def test_non_hebrew_dropped_by_default(self, tmp_path: Path):
        # "hello" all-Latin → dropped; "תל-אביב" has hyphen → dropped
        p = _write(tmp_path, "שלום\nhello\nתל-אביב\nעולם\n")
        assert load_words(p) == ["שלום", "עולם"]

    def test_non_hebrew_kept_when_disabled(self, tmp_path: Path):
        p = _write(tmp_path, "שלום\nhello\nתל-אביב\nעולם\n")
        result = load_words(p, drop_non_hebrew=False)
        assert result == ["שלום", "hello", "תל-אביב", "עולם"]

    def test_digits_are_non_hebrew(self, tmp_path: Path):
        p = _write(tmp_path, "שלום\nword123\n")
        assert load_words(p) == ["שלום"]


class TestFinalLetterNormalization:
    def test_finals_off_by_default(self, tmp_path: Path):
        # שלום ends with ם (U+05DD final mem)
        p = _write(tmp_path, "שלום\n")
        result = load_words(p)
        assert result == ["שלום"]
        assert "ם" in result[0]
        assert "מ" not in result[0]

    def test_finals_normalized_when_requested(self, tmp_path: Path):
        p = _write(tmp_path, "שלום\n")
        result = load_words(p, normalize_finals=True)
        # ם → מ, so result is שלומ (length 4, ending in regular mem)
        assert result == ["שלומ"]
        assert "ם" not in result[0]
        assert "מ" in result[0]


class TestStripNiqqud:
    def test_niqqud_preserved_when_disabled(self, tmp_path: Path):
        # שָׁלוֹם raw — niqqud chars are still in Hebrew block U+0590-05FF
        original = "שָׁלוֹם"
        p = _write(tmp_path, original + "\n")
        result = load_words(p, strip_niqqud=False)
        assert result == [original]


class TestDeduplication:
    def test_dedup_preserves_first_seen_order(self, tmp_path: Path):
        p = _write(tmp_path, "שלום\nעולם\nשלום\nספר\nעולם\n")
        assert load_words(p) == ["שלום", "עולם", "ספר"]

    def test_dedup_after_normalization(self, tmp_path: Path):
        # שָׁלוֹם and שלום dedupe to same word after niqqud strip
        p = _write(tmp_path, "שָׁלוֹם\nשלום\n")
        assert load_words(p) == ["שלום"]

    def test_dedup_after_final_normalization(self, tmp_path: Path):
        # שלום (ends with final-mem ם U+05DD) and שלומ (regular מ U+05DE)
        # dedupe to a single entry when normalize_finals=True maps both to שלומ.
        p = _write(tmp_path, "שלום\nשלומ\n")
        assert load_words(p, normalize_finals=True) == ["שלומ"]


class TestTypeErrors:
    def test_int_path_raises_type_error(self):
        with pytest.raises(TypeError):
            load_words(123)  # type: ignore[arg-type]

    def test_none_path_raises_type_error(self):
        with pytest.raises(TypeError):
            load_words(None)  # type: ignore[arg-type]

    def test_list_path_raises_type_error(self):
        with pytest.raises(TypeError):
            load_words(["words.txt"])  # type: ignore[arg-type]


class TestMissingFile:
    def test_missing_file_raises_file_not_found(self, tmp_path: Path):
        missing = tmp_path / "does_not_exist.txt"
        with pytest.raises(FileNotFoundError):
            load_words(missing)


class TestFindMatchingWords:
    def test_exact_match(self, tmp_path: Path):
        # Rack equals a dictionary word; ספר ends with ר (not a final letter)
        p = _write(tmp_path, "ספר\nאבג\n")
        # rack contains ר, פ, ס — exactly enough for ספר
        assert find_matching_words("ספר", p) == ["ספר"]

    def test_extra_letters_in_rack(self, tmp_path: Path):
        p = _write(tmp_path, "ספר\nשבת\n")
        # rack covers both candidates
        result = find_matching_words("ספרשבת", p)
        assert result == ["ספר", "שבת"]

    def test_insufficient_letters(self, tmp_path: Path):
        p = _write(tmp_path, "ספר\nשבת\n")
        # rack has letters for ספר but not שבת
        assert find_matching_words("ספר", p) == ["ספר"]

    def test_no_matches(self, tmp_path: Path):
        p = _write(tmp_path, "ספר\nשבת\n")
        assert find_matching_words("אבגד", p) == []

    def test_wildcard(self, tmp_path: Path):
        p = _write(tmp_path, "ספר\nשבת\n")
        # one wildcard substitutes for the missing ת
        assert find_matching_words("שב?", p) == ["שבת"]

    def test_custom_wildcard_char(self, tmp_path: Path):
        p = _write(tmp_path, "ספר\n")
        assert find_matching_words("ס*ר", p, wildcard="*") == ["ספר"]

    def test_one_letter_entries_filtered_by_default(self, tmp_path: Path):
        # Even though the rack contains "א", a one-letter dictionary entry is
        # dropped by load_words and never considered for matching.
        p = _write(tmp_path, "א\nספר\n")
        assert find_matching_words("אספר", p) == ["ספר"]

    def test_preserves_dictionary_order(self, tmp_path: Path):
        # Write entries in a non-alphabetical order; result must mirror it.
        p = _write(tmp_path, "שבת\nספר\nאב\n")
        rack = "אבספרשבת"
        assert find_matching_words(rack, p) == ["שבת", "ספר", "אב"]

    def test_normalize_finals_true(self, tmp_path: Path):
        # Dict word שלום (with ם U+05DD) becomes שלומ (regular מ U+05DE) when
        # normalize_finals=True. The rack must also use regular מ to match,
        # since this function does NOT pre-normalize the rack.
        p = _write(tmp_path, "שלום\nאבג\n")
        rack_with_regular_mem = "שלומ"
        assert find_matching_words(rack_with_regular_mem, p, normalize_finals=True) == [
            "שלומ"
        ]

    def test_normalize_finals_default_keeps_finals(self, tmp_path: Path):
        # Default behavior: dict keeps final-form ם, so a rack with final ם
        # matches and a rack with regular מ does not.
        p = _write(tmp_path, "שלום\n")
        assert find_matching_words("שלום", p) == ["שלום"]
        assert find_matching_words("שלומ", p) == []

    def test_missing_path_raises_file_not_found(self, tmp_path: Path):
        missing = tmp_path / "nope.txt"
        with pytest.raises(FileNotFoundError):
            find_matching_words("שלום", missing)

    def test_min_length_forwarded(self, tmp_path: Path):
        # When min_length=1, the one-letter entry survives load_words and
        # becomes eligible for matching.
        p = _write(tmp_path, "א\nספר\n")
        result = find_matching_words("אספר", p, min_length=1)
        assert result == ["א", "ספר"]


class TestSourceFileNotMutated:
    def test_bytes_unchanged_after_load(self, tmp_path: Path):
        original_text = (
            "# header\n"
            "שָׁלוֹם\n"
            "עולם\n"
            "\n"
            "hello\n"
            "תל-אביב\n"
            "א\n"
            "שלום\n"
        )
        p = _write(tmp_path, original_text)
        before = p.read_bytes()

        # Run with several option combinations to be sure none of them
        # secretly write back.
        load_words(p)
        load_words(p, min_length=1)
        load_words(p, normalize_finals=True)
        load_words(p, strip_niqqud=False)
        load_words(p, drop_non_hebrew=False)

        after = p.read_bytes()
        assert before == after
