import { describe, expect, it } from "vitest";
import {
  findMultiWordAnagrams,
  MULTI_WORD_DEFAULT_MAX_RESULTS,
} from "./multiwordAnagrams";

// Tests use small in-memory dictionaries with already-base-form letters
// (i.e. final letters collapsed: ם → מ, ך → כ, ן → נ, ף → פ, ץ → צ).
// This mirrors how the web app feeds words to the search after preprocessing
// with normalizeFinals=true. Display-side restoration is a separate concern
// (see hebrew.test.ts → restoreFinalLettersForDisplay).

describe("findMultiWordAnagrams — exact two-word combinations", () => {
  it('finds "טל עפ" (i.e. טל + עף) for the letters of עטלף', () => {
    // Input + dict are in base form.
    const dict = ["טל", "עפ", "אבג", "שלומ"];
    const result = findMultiWordAnagrams("עטלפ", dict);
    expect(result).toEqual([{ words: ["טל", "עפ"] }]);
  });

  it('finds "יש פריכ" (i.e. יש + פריך) for the letters of "שי כפיר"', () => {
    const dict = ["יש", "פריכ", "אבג"];
    // Input has spaces; they should be ignored.
    const result = findMultiWordAnagrams("שי כפיר", dict);
    expect(result).toEqual([{ words: ["יש", "פריכ"] }]);
  });
});

describe("findMultiWordAnagrams — exact three-word combinations", () => {
  it("finds a 3-word combination only when no 1- or 2-word combo exists", () => {
    // Letters of אבגד split exactly as א + ב + גד (single letters filtered by
    // minLength=2 default), or as אב + גד (2-word). 3-word should not appear
    // because every word in the dict is length ≥ 2.
    const dict = ["אב", "גד", "אבג", "ד", "א"];
    const result = findMultiWordAnagrams("אבגד", dict);
    // Expected: only the 2-word combination אב + גד
    expect(result).toEqual([{ words: ["אב", "גד"] }]);
  });

  it("returns a true 3-word combination when the input fits 3 words", () => {
    // Input letters: אבגדהו (6 letters)
    // Words: אב (2), גד (2), הו (2) — combine into a 3-word anagram.
    const dict = ["אב", "גד", "הו"];
    const result = findMultiWordAnagrams("אבגדהו", dict);
    expect(result).toEqual([{ words: ["אב", "גד", "הו"] }]);
  });
});

describe("findMultiWordAnagrams — exact letter consumption", () => {
  it("rejects combinations that leave any letter unused", () => {
    // Input has 5 letters; only 4-letter combo possible — must NOT be returned.
    const dict = ["אב", "גד"];
    const result = findMultiWordAnagrams("אבגדה", dict);
    expect(result).toEqual([]);
  });

  it("rejects combinations that would need extra letters not in the rack", () => {
    const dict = ["אבג"]; // needs 3 letters
    // Input only has 2 of those letters.
    const result = findMultiWordAnagrams("אב", dict);
    expect(result).toEqual([]);
  });

  it("returns [] for empty input", () => {
    expect(findMultiWordAnagrams("", ["אב", "גד"])).toEqual([]);
  });

  it("returns [] when input is whitespace-only", () => {
    expect(findMultiWordAnagrams("   ", ["אב", "גד"])).toEqual([]);
  });

  it("returns [] when input contains non-Hebrew characters", () => {
    expect(findMultiWordAnagrams("hello", ["אב", "גד"])).toEqual([]);
    expect(findMultiWordAnagrams("אב-גד", ["אב", "גד"])).toEqual([]);
  });
});

describe("findMultiWordAnagrams — wildcard", () => {
  it("returns [] when the input contains a literal `?`", () => {
    const dict = ["יש", "פריכ"];
    expect(findMultiWordAnagrams("שי?כפיר", dict)).toEqual([]);
  });

  it("respects a custom wildcard character", () => {
    const dict = ["יש", "פריכ"];
    expect(findMultiWordAnagrams("שי*כפיר", dict, { wildcard: "*" })).toEqual([]);
  });
});

describe("findMultiWordAnagrams — duplicate prevention and ordering", () => {
  it("does not return permutation duplicates of the same combination", () => {
    // יש + פריכ and פריכ + יש would both consume the same letters.
    // The non-decreasing-index search must return only one.
    const dict = ["יש", "פריכ"];
    const result = findMultiWordAnagrams("שיכפיר", dict);
    expect(result).toEqual([{ words: ["יש", "פריכ"] }]);
  });

  it("returns combinations in dictionary-discovery (non-decreasing index) order", () => {
    // Two distinct combos: (אב + גד) and (גד + אב). Only the first appears
    // because the recursion only emits non-decreasing index sequences.
    const dict = ["אב", "גד"];
    expect(findMultiWordAnagrams("אבגד", dict)).toEqual([
      { words: ["אב", "גד"] },
    ]);
  });

  it("emits multiple distinct combinations stably, dict-order", () => {
    // Input אבגדהו has multiple exact consumptions. With dict in this fixed
    // order, the non-decreasing-index search visits them deterministically.
    const dict = ["אב", "גד", "הו", "גדהו", "אבגד"];
    const result = findMultiWordAnagrams("אבגדהו", dict);
    expect(result).toEqual([
      { words: ["אב", "גד", "הו"] }, // indices 0,1,2
      { words: ["אב", "גדהו"] }, //      indices 0,3
      { words: ["הו", "אבגד"] }, //      indices 2,4 — note the start word
      // ↑ NOT [אבגד, הו]: that would require index 4→2, which violates the
      //   non-decreasing rule and would be a permutation duplicate of 2,4.
    ]);
  });
});

describe("findMultiWordAnagrams — repeats and limits", () => {
  it("allows the same word to appear twice when the rack has the letters", () => {
    // Rack אבאב = two copies of א and two of ב. With dict ["אב"],
    // the only valid combination is אב + אב.
    const dict = ["אב"];
    expect(findMultiWordAnagrams("אבאב", dict)).toEqual([
      { words: ["אב", "אב"] },
    ]);
  });

  it("filters out one-letter dictionary entries by default", () => {
    // Even though א and ב are present in the dict, default minLength=2 drops
    // them, so אב alone is the only candidate. That alone cannot consume אבג.
    const dict = ["א", "ב", "אב"];
    expect(findMultiWordAnagrams("אבג", dict)).toEqual([]);
  });

  it("never produces 4+ word combinations under default maxWords", () => {
    // אבגדה — could split as א+ב+ג+ד+ה (5 one-letter words, but those are
    // filtered by minLength). With minLength=2 the only candidates here are
    // אב, גד; together they only reach 4 letters, not 5 → no combination.
    const dict = ["אב", "גד"];
    expect(findMultiWordAnagrams("אבגדה", dict)).toEqual([]);
  });

  it("respects a custom maxResults cap", () => {
    const dict = ["אב"]; // only one candidate
    // Rack length 8 = 4 copies of אב. With default maxWords=3, the only
    // possible combo is empty (4 words exceeds maxWords). Use a small input
    // that produces multiple combos to exercise the cap.
    const racks = ["אבאב"]; // forces 1 combo (אב + אב)
    expect(findMultiWordAnagrams(racks[0], dict, { maxResults: 0 })).toEqual([]);
    expect(findMultiWordAnagrams(racks[0], dict, { maxResults: 1 })).toEqual([
      { words: ["אב", "אב"] },
    ]);
  });

  it("exposes the documented default maxResults constant", () => {
    expect(MULTI_WORD_DEFAULT_MAX_RESULTS).toBe(200);
  });

  it("respects maxInputLetters as a perf safeguard", () => {
    const dict = ["אב", "גד"];
    // Input is 4 letters. With maxInputLetters=3, search short-circuits.
    expect(findMultiWordAnagrams("אבגד", dict, { maxInputLetters: 3 })).toEqual([]);
    // Lifting the cap to 4 lets the same input through to a real result.
    expect(findMultiWordAnagrams("אבגד", dict, { maxInputLetters: 4 })).toEqual([
      { words: ["אב", "גד"] },
    ]);
    // Default cap is well above 4, so the default call also works.
    expect(findMultiWordAnagrams("אבגד", dict)).toEqual([{ words: ["אב", "גד"] }]);
  });

  it("counts letters after stripping whitespace and niqqud, not raw chars", () => {
    // Cleaned letter count = 4 (אבגד). The 7-char raw input with spaces and
    // niqqud must NOT trip a maxInputLetters=4 cap.
    expect(
      findMultiWordAnagrams("אָב גָד", ["אב", "גד"], { maxInputLetters: 4 }),
    ).toEqual([{ words: ["אב", "גד"] }]);
  });
});
