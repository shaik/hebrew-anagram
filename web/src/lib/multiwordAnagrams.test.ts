import { describe, expect, it } from "vitest";
import {
  findMultiWordAnagrams,
  isRequiredWordSatisfiable,
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

describe("findMultiWordAnagrams — requiredWord", () => {
  it("empty required word behaves identically to no requiredWord", () => {
    const dict = ["אב", "גד"];
    const noOpt = findMultiWordAnagrams("אבגד", dict);
    const empty = findMultiWordAnagrams("אבגד", dict, { requiredWord: "" });
    const ws = findMultiWordAnagrams("אבגד", dict, { requiredWord: "   " });
    expect(empty).toEqual(noOpt);
    expect(ws).toEqual(noOpt);
  });

  it('finds [קר, אפס] for input "אפרסק" + requiredWord "קר"', () => {
    // Spec example. אפרסק = {א,פ,ר,ס,ק}; קר = {ק,ר}; remaining = {א,פ,ס};
    // אפס exactly consumes the remaining letters.
    const dict = ["קר", "אפס", "אבג"];
    const result = findMultiWordAnagrams("אפרסק", dict, { requiredWord: "קר" });
    expect(result).toEqual([{ words: ["קר", "אפס"] }]);
  });

  it("returns [] when the required word is not a subset of the input", () => {
    const dict = ["אב", "גד"];
    // requiredCounts = {ד,ה}; ה is not in input "אבג".
    expect(
      findMultiWordAnagrams("אבג", dict, { requiredWord: "דה" }),
    ).toEqual([]);
  });

  it("trims whitespace and strips niqqud from the required word", () => {
    const dict = ["קר", "אפס"];
    expect(
      findMultiWordAnagrams("אפרסק", dict, { requiredWord: "  קָר  " }),
    ).toEqual([{ words: ["קר", "אפס"] }]);
  });

  it("returns [] when the required word contains non-Hebrew characters", () => {
    const dict = ["קר", "אפס"];
    expect(
      findMultiWordAnagrams("אפרסק", dict, { requiredWord: "ab" }),
    ).toEqual([]);
  });

  it("returns the required word alone when it fully consumes the input", () => {
    // Required word == input → 1-word combination is valid output.
    const dict = ["קר", "אפס"];
    expect(
      findMultiWordAnagrams("קר", dict, { requiredWord: "קר" }),
    ).toEqual([{ words: ["קר"] }]);
  });

  it("counts the required word toward maxWords", () => {
    // 6-letter input + 2-letter required word leaves 4 letters. With
    // maxWords=3 default, that's at most 2 additional words. With dict
    // entries that fit, we should see both the 2-additional and 1-additional
    // splits.
    const dict = ["אב", "גד", "הו", "גדהו"];
    const result = findMultiWordAnagrams("אבגדהו", dict, { requiredWord: "אב" });
    expect(result).toEqual([
      { words: ["אב", "גד", "הו"] }, // 1 + 2 additional = 3 total
      { words: ["אב", "גדהו"] }, //     1 + 1 additional = 2 total
    ]);
  });

  it("does NOT exceed maxWords when the required word counts as one slot", () => {
    // With requiredWord="אב" and maxWords=3, the search may add up to 2
    // additional words. Adding "אב" + "גד" + "הו" + "זח" would be 4 total
    // and is not allowed.
    const dict = ["אב", "גד", "הו", "זח"];
    // Input is 8 letters → 6 remaining after "אב". Three 2-letter words
    // (גד+הו+זח) would consume exactly that, but require 3 additional words.
    expect(
      findMultiWordAnagrams("אבגדהוזח", dict, { requiredWord: "אב" }),
    ).toEqual([]);
  });

  it("excludes the required word from candidates so it appears at most once", () => {
    // If we did NOT exclude, [אב, אב] would be a valid 2-word combo for
    // input "אבאב" with required "אב". Per spec, the required word must
    // appear exactly once → result is empty.
    const dict = ["אב"];
    expect(
      findMultiWordAnagrams("אבאב", dict, { requiredWord: "אב" }),
    ).toEqual([]);
  });

  it("rejects partial-match combinations (no leftover letters allowed)", () => {
    // Input has 5 letters. Required אב = 2; remaining 3 letters but only
    // 2-letter candidate available → no exact consumption → no result.
    const dict = ["אב", "גד"];
    expect(
      findMultiWordAnagrams("אבגדה", dict, { requiredWord: "אב" }),
    ).toEqual([]);
  });

  it("respects maxResults under the fixed-word path", () => {
    // Required word + multiple possible additional splits. Cap at 1.
    const dict = ["אב", "גד", "הו", "גדהו"];
    const result = findMultiWordAnagrams("אבגדהו", dict, {
      requiredWord: "אב",
      maxResults: 1,
    });
    expect(result.length).toBe(1);
  });

  it("works when the input was provided with the required word's letters mid-string", () => {
    // The required word's letters don't have to be contiguous in the input.
    const dict = ["קר", "אפס"];
    expect(
      findMultiWordAnagrams("פרא קס", dict, { requiredWord: "קר" }),
    ).toEqual([{ words: ["קר", "אפס"] }]);
  });
});

describe("isRequiredWordSatisfiable", () => {
  it("treats an empty required word as satisfiable (no constraint)", () => {
    expect(isRequiredWordSatisfiable("", "אבג")).toBe(true);
    expect(isRequiredWordSatisfiable("   ", "אבג")).toBe(true);
  });

  it("returns true when required is a subset of input", () => {
    expect(isRequiredWordSatisfiable("קר", "אפרסק")).toBe(true);
    expect(isRequiredWordSatisfiable("קָר", "אפרסק")).toBe(true); // niqqud stripped
    expect(isRequiredWordSatisfiable(" קר ", "אפרסק")).toBe(true); // whitespace stripped
  });

  it("returns false when required uses letters absent from input", () => {
    expect(isRequiredWordSatisfiable("קר", "אבג")).toBe(false); // missing ק, ר
  });

  it("returns false when required needs more copies of a letter than input has", () => {
    expect(isRequiredWordSatisfiable("ממ", "מילים")).toBe(false); // only one מ in input
  });

  it("returns false when required is non-Hebrew", () => {
    expect(isRequiredWordSatisfiable("abc", "אבג")).toBe(false);
  });

  it("returns false when input is empty or non-Hebrew", () => {
    expect(isRequiredWordSatisfiable("קר", "")).toBe(false);
    expect(isRequiredWordSatisfiable("קר", "abc")).toBe(false);
  });
});
