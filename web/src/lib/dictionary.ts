// Dictionary loading + matching.

import { isHebrewOnly, normalizeFinalLetters, removeNiqqud } from "./hebrew";
import { canFormWord } from "./matcher";

export interface PreprocessOptions {
  minLength?: number;
  dropNonHebrew?: boolean;
  normalizeFinals?: boolean;
  stripNiqqud?: boolean;
}

/**
 * Preprocess raw word-list text into a deduplicated array of words.
 *
 * Skips blank lines and `#` comments, strips niqqud (default on),
 * optionally normalizes final letters, drops non-Hebrew lines (default on),
 * filters by minimum length (default 2 — drops one-letter entries), and
 * deduplicates while preserving first-seen order.
 */
export function preprocessWordList(
  raw: string,
  {
    minLength = 2,
    dropNonHebrew = true,
    normalizeFinals = false,
    stripNiqqud = true,
  }: PreprocessOptions = {},
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const rawLine of raw.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    if (rawLine.trimStart().startsWith("#")) continue;

    let word = rawLine.trim();
    if (stripNiqqud) word = removeNiqqud(word);
    if (normalizeFinals) word = normalizeFinalLetters(word);

    if (dropNonHebrew && !isHebrewOnly(word)) continue;
    if (word.length < minLength) continue;
    if (seen.has(word)) continue;

    seen.add(word);
    out.push(word);
  }

  return out;
}

export interface FindMatchingOptions {
  minLength?: number;
  normalizeFinals?: boolean;
  wildcard?: string;
}

/**
 * Filter a preprocessed word list down to entries formable from *letters*.
 * `letters` is passed through to `canFormWord` unchanged — pre-normalize
 * it yourself if `normalizeFinals` was used during preprocessing.
 */
export function findMatchingWords(
  letters: string,
  words: readonly string[],
  { wildcard = "?" }: { wildcard?: string } = {},
): string[] {
  return words.filter((w) => canFormWord(letters, w, { wildcard }));
}

/**
 * Fetch a UTF-8 word list from `url` and preprocess it.
 * Throws if the response is not OK.
 */
export async function loadWordsFromUrl(
  url: string,
  options: PreprocessOptions = {},
): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load dictionary: HTTP ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return preprocessWordList(text, options);
}
