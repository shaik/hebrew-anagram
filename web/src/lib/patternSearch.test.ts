import { describe, expect, it } from "vitest";
import {
  findWordsByPattern,
  PATTERN_DEFAULT_MAX_RESULTS,
} from "./patternSearch";

describe("findWordsByPattern — fixed letters", () => {
  it("matches words where every Hebrew letter is fixed", () => {
    expect(findWordsByPattern("שלום", ["שלום", "שלוט", "אבגד"])).toEqual(["שלום"]);
  });

  it("returns [] when no word matches the fixed letters", () => {
    expect(findWordsByPattern("שלום", ["אבגד", "שבת"])).toEqual([]);
  });
});

describe("findWordsByPattern — wildcards", () => {
  it("treats `?` as a wildcard", () => {
    // pattern ?לום matches words of length 4 ending with לום.
    expect(findWordsByPattern("?לום", ["שלום", "חלום", "אבגד"])).toEqual([
      "שלום",
      "חלום",
    ]);
  });

  it("treats `.` as a wildcard", () => {
    expect(findWordsByPattern(".לום", ["שלום", "חלום"])).toEqual(["שלום", "חלום"]);
  });

  it("treats `*` as a wildcard", () => {
    expect(findWordsByPattern("*לום", ["שלום", "חלום"])).toEqual(["שלום", "חלום"]);
  });

  it("treats digits as wildcards", () => {
    expect(findWordsByPattern("0לום", ["שלום", "חלום"])).toEqual(["שלום", "חלום"]);
  });

  it("treats Latin letters as wildcards", () => {
    expect(findWordsByPattern("Xלום", ["שלום", "חלום"])).toEqual(["שלום", "חלום"]);
  });

  it("treats ASCII punctuation as wildcards", () => {
    expect(findWordsByPattern("@לום", ["שלום"])).toEqual(["שלום"]);
    expect(findWordsByPattern("-לום", ["שלום"])).toEqual(["שלום"]);
  });

  it("supports mixed wildcard characters in one pattern", () => {
    // Spec example: pattern ??גד? — 5 wildcards/fixed mix.
    const dict = ["אבגדה", "אבגדו", "אבגדז", "אבגד", "אבגדהו"];
    expect(findWordsByPattern("??גד?", dict)).toEqual(["אבגדה", "אבגדו", "אבגדז"]);
  });

  it("matches the spec's longer example with mixed punctuation/letters", () => {
    // Spec: ?א??ב??צ — 8-letter pattern, fixed letters at indices 1, 4, 7.
    // Word must have א in slot 1, ב in slot 4, צ in slot 7.
    const dict = ["שאבדבמנצ", "אבדבמנצי", "שאבדבמנש"];
    // First: index 0=ש, 1=א, 2=ב, ...; pattern says index 1=א, index 4=ב, index 7=צ.
    // שאבדבמנצ: idx 1=א ✓, idx 4=ב ✓, idx 7=צ ✓ → match
    // אבדבמנצי: idx 1=ב ≠ א → no match
    // שאבדבמנש: idx 7=ש ≠ צ → no match
    expect(findWordsByPattern("?א??ב??צ", dict)).toEqual(["שאבדבמנצ"]);
  });
});

describe("findWordsByPattern — length", () => {
  it("requires the pattern length to equal the word length exactly", () => {
    const dict = ["שלום", "שלמה", "של", "שלומיאל"];
    expect(findWordsByPattern("????", dict)).toEqual(["שלום", "שלמה"]);
  });

  it("uses character count, not byte length, for Hebrew", () => {
    // Multi-byte UTF-8 must not skew counts.
    expect(findWordsByPattern("???", ["אבג", "אב", "אבגד"])).toEqual(["אבג"]);
  });
});

describe("findWordsByPattern — pattern hygiene", () => {
  it("strips whitespace inside the pattern (mobile copy/paste)", () => {
    expect(findWordsByPattern(" ש לום ", ["שלום"])).toEqual(["שלום"]);
  });

  it("strips niqqud from the pattern", () => {
    // The pattern as the user types may have niqqud; the dictionary stores
    // base letters. Length is measured AFTER niqqud removal.
    expect(findWordsByPattern("שָׁלוֹם", ["שלום"])).toEqual(["שלום"]);
  });

  it("returns [] when the cleaned pattern is empty", () => {
    expect(findWordsByPattern("", ["שלום"])).toEqual([]);
    expect(findWordsByPattern("    ", ["שלום"])).toEqual([]);
  });
});

describe("findWordsByPattern — final-letter normalization", () => {
  it("by default does not normalize: ם in the pattern only matches ם in the word", () => {
    // Patterns and words below are bit-for-bit Hebrew letters (no niqqud).
    // Without normalization, "שלום" (ends in ם U+05DD) does not match
    // pattern "שלומ" (ends in מ U+05DE).
    expect(findWordsByPattern("שלומ", ["שלום"])).toEqual([]);
    expect(findWordsByPattern("שלום", ["שלום"])).toEqual(["שלום"]);
  });

  it("with normalizeFinals=true, the pattern's finals collapse to base form", () => {
    // The dictionary in this test is in the same (collapsed) form to mirror
    // what the web app feeds to this function when its toggle is on.
    expect(
      findWordsByPattern("שלום", ["שלומ"], { normalizeFinals: true }),
    ).toEqual(["שלומ"]);
  });
});

describe("findWordsByPattern — caps and exports", () => {
  it("respects maxResults", () => {
    const dict = ["אבגד", "אבגה", "אבגו", "אבגז"];
    expect(findWordsByPattern("???ג", dict, { maxResults: 2 }).length).toBe(0);
    // ↑ none of the 4-letter words have ג at index 3 (last); all have ג at index 2.
    // Use a pattern that DOES match all of them at the cap:
    expect(findWordsByPattern("אבג?", dict, { maxResults: 2 })).toEqual(["אבגד", "אבגה"]);
    expect(findWordsByPattern("אבג?", dict, { maxResults: 0 })).toEqual([]);
  });

  it("exposes the documented default cap", () => {
    expect(PATTERN_DEFAULT_MAX_RESULTS).toBe(500);
  });
});
