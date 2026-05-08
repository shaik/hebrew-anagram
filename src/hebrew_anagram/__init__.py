"""Hebrew anagram / word-matching engine — POC."""

from .dictionary import find_matching_words, load_words
from .letters import normalize_text, remove_niqqud, normalize_final_letters
from .matcher import can_form_word
from .scoring import score_word

__all__ = [
    "normalize_text",
    "remove_niqqud",
    "normalize_final_letters",
    "can_form_word",
    "score_word",
    "load_words",
    "find_matching_words",
]
