import { describe, expect, it } from "vitest";
import { scoreWord } from "./scoring";

describe("scoreWord", () => {
  it("counts Hebrew letters", () => {
    expect(scoreWord("שלום")).toBe(4);
    expect(scoreWord("ירושלים")).toBe(7);
  });

  it("ignores niqqud", () => {
    expect(scoreWord("שָׁלוֹם")).toBe(4);
  });

  it("ignores punctuation, latin, and whitespace", () => {
    expect(scoreWord("שלום!")).toBe(4);
    expect(scoreWord("hello")).toBe(0);
    expect(scoreWord("שלום עולם")).toBe(8);
  });

  it("counts all five final letters", () => {
    expect(scoreWord("ךםןףץ")).toBe(5);
  });

  it("returns 0 for empty string", () => {
    expect(scoreWord("")).toBe(0);
  });
});
