// Crossword-style pattern search.
//
// A pattern is a string where Hebrew letters mark fixed positions and any
// non-Hebrew character is a wildcard for one letter. The matched word must
// have exactly the same length as the pattern (after whitespace strip).
//
// This is a deliberately permissive wildcard: `?`, `.`, `*`, digits, ASCII
// punctuation — anything not in the Hebrew letter range U+05D0–U+05EA — all
// behave the same. On a mobile keyboard it should be easy to type whatever
// placeholder is convenient.

import { normalizeFinalLetters, removeNiqqud } from "./hebrew";

const HEBREW_LETTER_START = 0x05d0;
const HEBREW_LETTER_END = 0x05ea;

function isHebrewLetter(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  return cp >= HEBREW_LETTER_START && cp <= HEBREW_LETTER_END;
}

export const PATTERN_DEFAULT_MAX_RESULTS = 500;

export interface PatternSearchOptions {
  /**
   * Apply final-letter normalization to the pattern's Hebrew letters before
   * matching. The dictionary is expected to be preprocessed with the same
   * setting (the web app's UI threads this through).
   */
  normalizeFinals?: boolean;
  /** Hard cap on returned matches. Default 500. */
  maxResults?: number;
}

/**
 * Return dictionary words that match `pattern`, where Hebrew letters in the
 * pattern mark fixed positions and any non-Hebrew character is a wildcard
 * for one letter. Niqqud and whitespace are stripped from the pattern
 * before matching, so the user can paste loosely. The match length is
 * exact: a 5-character cleaned pattern only matches 5-character words.
 *
 * Returns `[]` if the cleaned pattern is empty.
 */
export function findWordsByPattern(
  pattern: string,
  words: readonly string[],
  options: PatternSearchOptions = {},
): string[] {
  const { normalizeFinals = false, maxResults = PATTERN_DEFAULT_MAX_RESULTS } =
    options;

  // Strip niqqud + every whitespace (not just outer); on mobile, the user
  // may inadvertently include spaces.
  let cleanPattern = removeNiqqud(pattern).replace(/\s+/g, "");
  if (cleanPattern.length === 0) return [];
  if (normalizeFinals) cleanPattern = normalizeFinalLetters(cleanPattern);

  // Pre-compute, per pattern position, whether it is a fixed Hebrew letter
  // (and which one) or a wildcard. The pattern is split code-point-aware
  // for safety, but Hebrew dictionary words are entirely BMP so we can read
  // each candidate word with plain index access in the hot loop below.
  const patternChars = [...cleanPattern];
  const fixed: (string | null)[] = patternChars.map((ch) =>
    isHebrewLetter(ch) ? ch : null,
  );
  const patternLen = patternChars.length;

  const cap = Math.max(0, maxResults);
  if (cap === 0) return [];

  const out: string[] = [];
  for (const word of words) {
    if (word.length !== patternLen) continue;
    let ok = true;
    for (let i = 0; i < patternLen; i++) {
      const required = fixed[i];
      if (required !== null && word[i] !== required) {
        ok = false;
        break;
      }
    }
    if (ok) {
      out.push(word);
      if (out.length >= cap) break;
    }
  }
  return out;
}
