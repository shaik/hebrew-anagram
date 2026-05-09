// Multi-word exact anagram search.
//
// Given an input string and a preprocessed dictionary, find every combination
// of 2–3 dictionary words whose combined letter multiset exactly equals the
// input letter multiset (after niqqud strip and whitespace removal).
//
// Stable, deterministic ordering — combinations are returned in the order
// produced by a left-to-right depth-first search with non-decreasing
// candidate index, which avoids permutation duplicates.
//
// Optionally a `requiredWord` can be supplied. Every returned combination
// then begins with that word and includes it exactly once, with the
// remaining slots filled by other dictionary words. The required word
// counts toward `maxWords`.

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
  /**
   * Optional required word. When provided and non-empty, every returned
   * combination must include this word exactly once at the start of the
   * combination, with the remaining letters filled by other dictionary
   * words. Caller is responsible for any final-letter normalization on
   * this string (same convention as the input).
   */
  requiredWord?: string;
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

interface Candidate {
  word: string;
  counts: Counts;
}

function runSearch(
  remaining: Counts,
  candidates: readonly Candidate[],
  initialChosen: readonly string[],
  loDepth: number,
  hiDepth: number,
  cap: number,
): MultiWordResult[] {
  const results: MultiWordResult[] = [];
  const chosen: string[] = [...initialChosen];

  function search(rem: Counts, startIdx: number): boolean {
    if (results.length >= cap) return true;

    if (chosen.length >= loDepth && rem.size === 0) {
      results.push({ words: chosen.slice() });
      return results.length >= cap;
    }

    if (chosen.length >= hiDepth) return false;

    for (let i = startIdx; i < candidates.length; i++) {
      const c = candidates[i];
      if (!isCountsSubset(c.counts, rem)) continue;
      chosen.push(c.word);
      const stop = search(subtractCounts(rem, c.counts), i);
      chosen.pop();
      if (stop) return true;
    }
    return false;
  }

  if (cap > 0) search(remaining, 0);
  return results;
}

/** Pre-clean a string the same way `findMultiWordAnagrams` does internally. */
function clean(s: string): string {
  return removeNiqqud(s).replace(/\s+/g, "");
}

/**
 * True iff the (cleaned) `requiredWord` is either empty (no constraint) or
 * its letter multiset is a subset of the (cleaned) `input`'s. Use this from
 * UI code to surface a precise error before invoking the search.
 *
 * The caller must apply final-letter normalization to both sides if it has
 * been applied to the dictionary, exactly as for `findMultiWordAnagrams`.
 */
export function isRequiredWordSatisfiable(
  requiredWord: string,
  input: string,
): boolean {
  const cleanRequired = clean(requiredWord);
  if (cleanRequired === "") return true;
  if (!isHebrewOnly(cleanRequired)) return false;
  const cleanInput = clean(input);
  if (cleanInput === "") return false;
  if (!isHebrewOnly(cleanInput)) return false;
  return isCountsSubset(toCounts(cleanRequired), toCounts(cleanInput));
}

/**
 * Find combinations of dictionary words whose letter multiset exactly equals
 * the input letter multiset.
 *
 * The input is pre-cleaned: niqqud is stripped, whitespace is removed, and
 * non-Hebrew input is rejected. Combinations span `minWords`..`maxWords`
 * (default 2..3). Permutation duplicates are avoided by enforcing a
 * non-decreasing candidate index during recursion.
 *
 * If `requiredWord` is supplied (and non-empty after cleanup), every
 * returned combination begins with that word, includes it exactly once,
 * and uses up to `maxWords-1` additional dictionary words. A combination
 * containing only the required word is returned iff the required word
 * fully consumes the input.
 *
 * Returns `[]` if the input is empty, contains the wildcard character,
 * contains any non-Hebrew character after cleanup, exceeds the input-length
 * cap, or has a required word that is non-Hebrew or not a subset of the
 * input. Hard-capped at `maxResults` to bound the worst case.
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
    requiredWord = "",
  } = options;

  if (input.includes(wildcard)) return [];

  const cleanInput = clean(input);
  if (cleanInput.length === 0) return [];
  if (cleanInput.length > maxInputLetters) return [];
  if (!isHebrewOnly(cleanInput)) return [];

  const inputCounts = toCounts(cleanInput);

  // Build the candidate list once — anything not a subset of the input can
  // never appear in any valid combination.
  const allCandidates: Candidate[] = [];
  for (const w of words) {
    if (w.length < minLength) continue;
    const wc = toCounts(w);
    if (!isCountsSubset(wc, inputCounts)) continue;
    allCandidates.push({ word: w, counts: wc });
  }

  const cap = Math.max(0, maxResults);
  const hi = Math.min(MULTI_WORD_DEFAULT_MAX_WORDS, Math.max(1, maxWords));

  const cleanRequired = clean(requiredWord);

  if (cleanRequired === "") {
    const lo = Math.max(1, minWords);
    return runSearch(inputCounts, allCandidates, [], lo, hi, cap);
  }

  // Fixed-word path.
  if (!isHebrewOnly(cleanRequired)) return [];
  const requiredCounts = toCounts(cleanRequired);
  if (!isCountsSubset(requiredCounts, inputCounts)) return [];

  const remaining = subtractCounts(inputCounts, requiredCounts);

  // Exclude the required word itself from the candidates so it appears
  // exactly once in each result. (Comparison is on the already-cleaned form;
  // the candidate words come from `words`, which the caller has preprocessed
  // through the same niqqud-strip + final-letter pipeline.)
  const additional = allCandidates.filter((c) => c.word !== cleanRequired);

  // Use loDepth=1 so a required word that *fully* consumes the input is
  // returned as a single-word combination. Otherwise the search will only
  // succeed at chosen.length ≥ 2 (i.e., required word + ≥1 extra word).
  return runSearch(remaining, additional, [cleanRequired], 1, hi, cap);
}
