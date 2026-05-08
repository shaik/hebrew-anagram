import { describe, expect, it } from "vitest";
import {
  isHebrewOnly,
  normalizeFinalLetters,
  normalizeText,
  removeNiqqud,
  restoreFinalLettersForDisplay,
} from "./hebrew";

describe("removeNiqqud", () => {
  it("strips niqqud from שָׁלוֹם", () => {
    expect(removeNiqqud("שָׁלוֹם")).toBe("שלום");
  });

  it("leaves plain text untouched", () => {
    expect(removeNiqqud("שלום")).toBe("שלום");
    expect(removeNiqqud("hello world")).toBe("hello world");
  });

  it("preserves punctuation", () => {
    expect(removeNiqqud("שלום, עולם!")).toBe("שלום, עולם!");
  });

  it("handles empty string", () => {
    expect(removeNiqqud("")).toBe("");
  });
});

describe("normalizeFinalLetters", () => {
  it.each([
    ["מלך", "מלכ"],
    ["שלום", "שלומ"],
    ["גן", "גנ"],
    ["אף", "אפ"],
    ["ארץ", "ארצ"],
  ])("normalizes %s -> %s", (input, expected) => {
    expect(normalizeFinalLetters(input)).toBe(expected);
  });

  it("leaves words without final-form letters unchanged", () => {
    expect(normalizeFinalLetters("בית")).toBe("בית");
  });
});

describe("normalizeText", () => {
  it("strips niqqud by default", () => {
    expect(normalizeText("שָׁלוֹם")).toBe("שלום");
  });

  it("keeps niqqud when disabled", () => {
    expect(normalizeText("שָׁלוֹם", { removeNiqqudEnabled: false })).toBe("שָׁלוֹם");
  });

  it("collapses whitespace and trims", () => {
    expect(normalizeText("  שלום   עולם  ")).toBe("שלום עולם");
  });

  it("normalizes finals when requested", () => {
    expect(normalizeText("שלום", { normalizeFinals: true })).toBe("שלומ");
  });
});

describe("restoreFinalLettersForDisplay", () => {
  it.each([
    ["שלומ", "שלום"],
    ["מלכ", "מלך"],
    ["גנ", "גן"],
    ["אפ", "אף"],
    ["ארצ", "ארץ"],
  ])("converts trailing %s -> %s", (input, expected) => {
    expect(restoreFinalLettersForDisplay(input)).toBe(expected);
  });

  it("does not touch interior base-form letters", () => {
    // The interior מ in מנהל must stay מ; only end-of-word positions convert.
    expect(restoreFinalLettersForDisplay("מנהל")).toBe("מנהל");
    // Both an interior and a trailing convertible letter — only the trailing one flips.
    expect(restoreFinalLettersForDisplay("ממ")).toBe("מם");
  });

  it("leaves correctly-spelled words with finals untouched", () => {
    expect(restoreFinalLettersForDisplay("שלום")).toBe("שלום");
    expect(restoreFinalLettersForDisplay("ארץ")).toBe("ארץ");
  });

  it("processes each word in a multi-word string independently", () => {
    expect(restoreFinalLettersForDisplay("שלומ עולמ")).toBe("שלום עולם");
    expect(restoreFinalLettersForDisplay("יש פריכ")).toBe("יש פריך");
  });

  it("treats punctuation as a word boundary", () => {
    expect(restoreFinalLettersForDisplay("שלומ, עולמ!")).toBe("שלום, עולם!");
  });

  it("preserves whitespace runs verbatim", () => {
    expect(restoreFinalLettersForDisplay("שלומ   עולמ")).toBe("שלום   עולם");
    expect(restoreFinalLettersForDisplay("שלומ\tעולמ")).toBe("שלום\tעולם");
  });

  it("handles empty string and pure non-Hebrew input", () => {
    expect(restoreFinalLettersForDisplay("")).toBe("");
    expect(restoreFinalLettersForDisplay("hello")).toBe("hello");
  });

  it("does not touch letters that have no final form", () => {
    // ר is not a base->final candidate.
    expect(restoreFinalLettersForDisplay("ספר")).toBe("ספר");
  });

  it("treats Maqaf (U+05BE) as a word boundary", () => {
    // Maqaf is in the Hebrew block but is punctuation, not a letter.
    // Letters with no final form pass through:
    expect(restoreFinalLettersForDisplay("ספר־תורה")).toBe("ספר־תורה");
    // Letters that do have a final form must flip across the Maqaf:
    // בנ־מ → ב + (נ before Maqaf → ן) + ־ + (מ at end → ם) = "בן־ם".
    expect(restoreFinalLettersForDisplay("בנ־מ")).toBe("בן־ם");
  });

  it("treats niqqud as a word boundary so trailing letters still flip", () => {
    // Mem with a holam (U+05B9) at the end of a word should still flip to ם.
    // The niqqud comes *after* the consonant in Unicode order, so the mem is
    // followed by U+05B9, not by another letter.
    expect(restoreFinalLettersForDisplay("מֹ")).toBe("םֹ");
  });
});

describe("isHebrewOnly", () => {
  it("returns true for pure Hebrew", () => {
    expect(isHebrewOnly("שלום")).toBe(true);
    expect(isHebrewOnly("שָׁלוֹם")).toBe(true); // niqqud chars are still in 0590-05FF
  });

  it("returns false when any non-Hebrew character is present", () => {
    expect(isHebrewOnly("שלום!")).toBe(false);
    expect(isHebrewOnly("hello")).toBe(false);
    expect(isHebrewOnly("תל-אביב")).toBe(false); // hyphen
  });

  it("returns true for empty string", () => {
    expect(isHebrewOnly("")).toBe(true);
  });
});
