import { describe, expect, it } from "vitest";
import { findMatchingWords, preprocessWordList } from "./dictionary";

describe("preprocessWordList", () => {
  it("strips niqqud and returns words", () => {
    const out = preprocessWordList("שָׁלוֹם\nעוֹלָם\n");
    expect(out).toEqual(["שלום", "עולם"]);
  });

  it("filters one-letter entries by default", () => {
    const out = preprocessWordList("א\nשלום\nב\nספר\n");
    expect(out).toEqual(["שלום", "ספר"]);
  });

  it("keeps one-letter entries when minLength is 1", () => {
    const out = preprocessWordList("א\nשלום\n", { minLength: 1 });
    expect(out).toEqual(["א", "שלום"]);
  });

  it("skips blank lines and # comments (incl. indented)", () => {
    const out = preprocessWordList(
      "# header\n\nשלום\n  # indented\n\t# tabbed\n   \nעולם\n",
    );
    expect(out).toEqual(["שלום", "עולם"]);
  });

  it("drops non-Hebrew entries by default", () => {
    const out = preprocessWordList("שלום\nhello\nתל-אביב\nעולם\n");
    expect(out).toEqual(["שלום", "עולם"]);
  });

  it("keeps non-Hebrew when dropNonHebrew is false", () => {
    const out = preprocessWordList("שלום\nhello\nעולם\n", { dropNonHebrew: false });
    expect(out).toEqual(["שלום", "hello", "עולם"]);
  });

  it("normalizes finals when requested", () => {
    const out = preprocessWordList("שלום\n", { normalizeFinals: true });
    expect(out).toEqual(["שלומ"]);
  });

  it("preserves first-seen order while deduping", () => {
    const out = preprocessWordList("שלום\nעולם\nשלום\nספר\nעולם\n");
    expect(out).toEqual(["שלום", "עולם", "ספר"]);
  });

  it("handles CRLF line endings", () => {
    const out = preprocessWordList("שלום\r\nעולם\r\n");
    expect(out).toEqual(["שלום", "עולם"]);
  });
});

describe("findMatchingWords", () => {
  it("returns only words formable from the rack", () => {
    const dict = ["ספר", "שבת", "אבג"];
    expect(findMatchingWords("ספר", dict)).toEqual(["ספר"]);
  });

  it("preserves dictionary order", () => {
    const dict = ["שבת", "ספר", "אב"];
    expect(findMatchingWords("אבספרשבת", dict)).toEqual(["שבת", "ספר", "אב"]);
  });

  it("supports wildcard substitution", () => {
    expect(findMatchingWords("שב?", ["שבת"])).toEqual(["שבת"]);
  });

  it("returns empty array for empty rack", () => {
    expect(findMatchingWords("", ["ספר"])).toEqual([]);
  });
});
