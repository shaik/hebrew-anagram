// Multi-word exact anagram search.
//
// Given an input string and a preprocessed dictionary, find every combination
// of 2–3 dictionary words whose combined letter multiset exactly equals the
// input letter multiset (after niqqud strip and whitespace removal).
//
// Stable, deterministic ordering — combinations are returned in the order
// produced by a left-to-right depth-first search with non-decreasing
// candidate index, which avoids permutation duplicates.

import { isHebrewOnly, removeNiqqud } from "./hebrew";

export const MULTI_WORD_DEFAULT_MIN_WORDS = 2;
export const MULTI_WORD_DEFAULT_MAX_WORDS = 3;
export const MULTI_WORD_DEFAULT_MAX_RESULTS = 200;
export const MULTI_WORD_DEFAULT_MIN_LENGTH = 2;
export const MULTI_WORD_DEFAULT_WILDCARD = "?";

// Soft cap on the number of letters we will run multi-word search over.
// Worst-case DFS is bounded by candidate-count^maxWords, and the candidate
// count grows quickly with input length. Past ~14 letters we stop searching
// rather than risk a slow synchronous freeze on the main thread.
export const MULTI_WORD_DEFAULT_MAX_INPUT_LETTERS = 14;

export interface MultiWordOptions {
  /** Minimum number of words in a combination. Default 2. */
  minWords?: number;
  /** Maximum number of words in a combination. Default 3. Capped to 3. */
  maxWords?: number;
  /** Hard cap on returned combinations. Default 200. */
  maxResults?: number;
  /** Minimum length per dictionary word considered. Default 2. */
  minLength?: number;
  /** Wildcard character. If present in the input, search is disabled. */
  wildcard?: string;
  /**
   * Soft cap on input letters (after niqqud strip + whitespace removal).
   * Past this many letters the search is skipped to keep the UI thread
   * responsive. Default 14.
   */
  maxInputLetters?: number;
}

export interface MultiWordResult {
  /** Words in the combination, in dictionary-discovery order. */
  words: readonly string[];
}

type Counts = Map<string, number>;

function toCounts(s: string): Counts {
  const m = new Map<string, number>();
  for (const ch of s) m.set(ch, (m.get(ch) ?? 0) + 1);
  return m;
}

function isCountsSubset(needed: Counts, available: Counts): boolean {
  for (const [k, v] of needed) {
    if ((available.get(k) ?? 0) < v) return false;
  }
  return true;
}

function subtractCounts(remaining: Counts, word: Counts): Counts {
  const out = new Map(remaining);
  for (const [k, v] of word) {
    const cur = out.get(k) ?? 0;
    if (cur === v) out.delete(k);
    else out.set(k, cur - v);
  }
  return out;
}

/**
 * Find combinations of dictionary words whose letter multiset exactly equals
 * the input letter multiset.
 *
 * The input is pre-cleaned: niqqud is stripped, whitespace is removed, and
 * non-Hebrew input is rejected. Combinations span `minWords`..`maxWords`
 * (default 2..3). Permutation duplicates are avoided by enforcing a
 * non-decreasing candidate index during recursion. The same word may legally
 * repeat inside a combination if the input letters allow it.
 *
 * Returns `[]` if the input is empty, contains the wildcard character, or
 * contains any non-Hebrew character after cleanup. Hard-capped at
 * `maxResults` to keep the worst-case bounded.
 */
export function findMultiWordAnagrams(
  input: string,
  words: readonly string[],
  options: MultiWordOptions = {},
): MultiWordResult[] {
  const {
    minWords = MULTI_WORD_DEFAULT_MIN_WORDS,
    maxWords = MULTI_WORD_DEFAULT_MAX_WORDS,
    maxResults = MULTI_WORD_DEFAULT_MAX_RESULTS,
    minLength = MULTI_WORD_DEFAULT_MIN_LENGTH,
    wildcard = MULTI_WORD_DEFAULT_WILDCARD,
    maxInputLetters = MULTI_WORD_DEFAULT_MAX_INPUT_LETTERS,
  } = options;

  if (input.includes(wildcard)) return [];

  const cleanInput = removeNiqqud(input).replace(/\s+/g, "");
  if (cleanInput.length === 0) return [];
  if (cleanInput.length > maxInputLetters) return [];
  if (!isHebrewOnly(cleanInput)) return [];

  const inputCounts = toCounts(cleanInput);

  // Keep only words whose multiset is a subset of the input — anything else
  // can never appear in a valid combination, regardless of depth.
  type Candidate = { word: string; counts: Counts };
  const candidates: Candidate[] = [];
  for (const w of words) {
    if (w.length < minLength) continue;
    const wc = toCounts(w);
    if (!isCountsSubset(wc, inputCounts)) continue;
    candidates.push({ word: w, counts: wc });
  }

  const cap = Math.max(0, maxResults);
  const lo = Math.max(1, minWords);
  const hi = Math.min(MULTI_WORD_DEFAULT_MAX_WORDS, Math.max(lo, maxWords));

  const results: MultiWordResult[] = [];
  const chosen: string[] = [];

  // Returns true once the result cap is reached, signalling unwind.
  function search(remaining: Counts, startIdx: number): boolean {
    if (results.length >= cap) return true;

    if (chosen.length >= lo && remaining.size === 0) {
      results.push({ words: chosen.slice() });
      return results.length >= cap;
    }

    if (chosen.length >= hi) return false;

    for (let i = startIdx; i < candidates.length; i++) {
      const c = candidates[i];
      if (!isCountsSubset(c.counts, remaining)) continue;
      chosen.push(c.word);
      const stop = search(subtractCounts(remaining, c.counts), i);
      chosen.pop();
      if (stop) return true;
    }
    return false;
  }

  if (cap > 0) search(inputCounts, 0);
  return results;
}
