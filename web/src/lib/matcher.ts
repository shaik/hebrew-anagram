// Anagram matcher.
// Final-letter normalization is OFF by default — ם and מ are distinct.

import { removeNiqqud } from "./hebrew";

export interface CanFormOptions {
  wildcard?: string;
}

/**
 * True iff *candidate* can be formed from the available *letters*.
 *
 * - Niqqud is stripped from both sides before matching.
 * - Whitespace inside *letters* is ignored (so a "rack" can be entered as
 *   spaced-out characters).
 * - Each occurrence of *wildcard* in *letters* substitutes for any single
 *   Hebrew letter in *candidate* not covered by a real letter.
 * - Final letters are NOT normalized; pre-normalize both sides to make
 *   ם and מ interchangeable.
 */
export function canFormWord(
  letters: string,
  candidate: string,
  { wildcard = "?" }: CanFormOptions = {},
): boolean {
  const rack = removeNiqqud(letters).replace(/\s+/g, "");
  const word = removeNiqqud(candidate);

  const counts = new Map<string, number>();
  for (const ch of rack) counts.set(ch, (counts.get(ch) ?? 0) + 1);

  const wildcardsAvailable = counts.get(wildcard) ?? 0;
  counts.delete(wildcard);

  let wildcardsUsed = 0;
  for (const ch of word) {
    const have = counts.get(ch) ?? 0;
    if (have > 0) {
      counts.set(ch, have - 1);
    } else if (wildcardsUsed < wildcardsAvailable) {
      wildcardsUsed += 1;
    } else {
      return false;
    }
  }
  return true;
}
