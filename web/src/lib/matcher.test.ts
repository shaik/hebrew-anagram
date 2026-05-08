import { describe, expect, it } from "vitest";
import { canFormWord } from "./matcher";

describe("canFormWord", () => {
  it("matches when rack equals candidate", () => {
    expect(canFormWord("שלום", "שלום")).toBe(true);
  });

  it("matches when rack has extra letters (using ם final-mem on both sides)", () => {
    expect(canFormWord("שלוםבית", "שלום")).toBe(true);
  });

  it("matches an anagram (no final letters)", () => {
    expect(canFormWord("רפס", "ספר")).toBe(true);
  });

  it("returns false when rack is missing a letter", () => {
    expect(canFormWord("שלו", "שלום")).toBe(false);
  });

  it("returns false when wrong letters", () => {
    expect(canFormWord("אבגד", "שלום")).toBe(false);
  });

  it("treats ם and מ as distinct by default", () => {
    expect(canFormWord("מ", "ם")).toBe(false);
    expect(canFormWord("ם", "מ")).toBe(false);
  });

  it("ignores whitespace inside the rack", () => {
    expect(canFormWord("ש ל ו ם", "שלום")).toBe(true);
    expect(canFormWord("ש\tל\nו\rם", "שלום")).toBe(true);
  });

  it("strips niqqud from both sides before matching", () => {
    expect(canFormWord("שָׁלוֹם", "שלום")).toBe(true);
    expect(canFormWord("שלום", "שָׁלוֹם")).toBe(true);
  });

  it("uses ? as a wildcard for one missing letter", () => {
    expect(canFormWord("שלו?", "שלום")).toBe(true);
  });

  it("rejects when wildcards are insufficient", () => {
    expect(canFormWord("?", "אב")).toBe(false);
  });

  it("supports custom wildcard char", () => {
    expect(canFormWord("של*", "שלם", { wildcard: "*" })).toBe(true);
  });

  it("returns true for empty candidate (no letters needed)", () => {
    expect(canFormWord("שלום", "")).toBe(true);
    expect(canFormWord("", "")).toBe(true);
  });

  it("returns false for empty rack with non-empty candidate", () => {
    expect(canFormWord("", "א")).toBe(false);
  });
});
