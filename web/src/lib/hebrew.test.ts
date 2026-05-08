import { describe, expect, it } from "vitest";
import {
  isHebrewOnly,
  normalizeFinalLetters,
  normalizeText,
  removeNiqqud,
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
