import { describe, expect, it } from "vitest";
import { buildShareUrl, decodeQueryToState, encodeStateToQuery } from "./urlState";

const EMPTY = { rack: "", fixedWord: "", anagram: "" };

describe("encodeStateToQuery", () => {
  it("returns an empty string for empty state", () => {
    expect(encodeStateToQuery(EMPTY)).toBe("");
  });

  it("encodes the rack as q", () => {
    const q = encodeStateToQuery({ ...EMPTY, rack: "שלום" });
    expect(q).toBe(`q=${encodeURIComponent("שלום")}`);
  });

  it("encodes the fixed word as f", () => {
    const q = encodeStateToQuery({ ...EMPTY, rack: "שלום", fixedWord: "של" });
    expect(q).toContain(`f=${encodeURIComponent("של")}`);
  });

  it("encodes the revealed anagram as a", () => {
    const q = encodeStateToQuery({ ...EMPTY, rack: "שלום", anagram: "של ומ" });
    expect(q).toContain(`a=${encodeURIComponent("של ומ").replace(/%20/g, "+")}`);
  });

  it("round-trips through decode", () => {
    const state = { rack: "שי כפיר", fixedWord: "שיר", anagram: "שיר כיף" };
    expect(decodeQueryToState(encodeStateToQuery(state))).toEqual(state);
  });
});

describe("decodeQueryToState", () => {
  it("returns empty state for an empty query", () => {
    expect(decodeQueryToState("")).toEqual(EMPTY);
  });

  it("accepts a leading question mark", () => {
    expect(decodeQueryToState("?q=בית")).toEqual({ ...EMPTY, rack: "בית" });
  });

  it("reads the legacy f param as the fixed word and ignores other legacy params", () => {
    expect(
      decodeQueryToState("?q=בית&m=crossword&min=3&nf=0&sort=dict&f=קר&junk=1"),
    ).toEqual({ ...EMPTY, rack: "בית", fixedWord: "קר" });
  });

  it("never throws on malformed input", () => {
    expect(decodeQueryToState("%%%&&&==")).toEqual(EMPTY);
  });
});

describe("buildShareUrl", () => {
  const loc = {
    origin: "https://example.com",
    pathname: "/anagrams/",
    hash: "",
  } as Location;

  it("appends the query when state is non-empty", () => {
    expect(buildShareUrl({ ...EMPTY, rack: "שלום" }, loc)).toBe(
      `https://example.com/anagrams/?q=${encodeURIComponent("שלום")}`,
    );
  });

  it("omits the query for empty state and preserves the hash", () => {
    const withHash = { ...loc, hash: "#top" } as Location;
    expect(buildShareUrl(EMPTY, withHash)).toBe("https://example.com/anagrams/#top");
  });
});
