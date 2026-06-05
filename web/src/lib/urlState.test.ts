import { describe, expect, it } from "vitest";
import { buildShareUrl, decodeQueryToState, encodeStateToQuery } from "./urlState";

describe("encodeStateToQuery", () => {
  it("returns an empty string for empty state", () => {
    expect(encodeStateToQuery({ rack: "", anagram: "" })).toBe("");
  });

  it("encodes the rack as q", () => {
    const q = encodeStateToQuery({ rack: "שלום", anagram: "" });
    expect(q).toBe(`q=${encodeURIComponent("שלום")}`);
  });

  it("encodes the revealed anagram as a", () => {
    const q = encodeStateToQuery({ rack: "שלום", anagram: "של ומ" });
    expect(q).toContain(`a=${encodeURIComponent("של ומ").replace(/%20/g, "+")}`);
  });

  it("round-trips through decode", () => {
    const q = encodeStateToQuery({ rack: "שי כפיר", anagram: "שפיר כי" });
    expect(decodeQueryToState(q)).toEqual({ rack: "שי כפיר", anagram: "שפיר כי" });
  });
});

describe("decodeQueryToState", () => {
  it("returns empty state for an empty query", () => {
    expect(decodeQueryToState("")).toEqual({ rack: "", anagram: "" });
  });

  it("accepts a leading question mark", () => {
    expect(decodeQueryToState("?q=בית")).toEqual({ rack: "בית", anagram: "" });
  });

  it("ignores legacy and unknown params", () => {
    expect(
      decodeQueryToState("?q=בית&m=crossword&min=3&nf=0&sort=dict&f=קר&junk=1"),
    ).toEqual({ rack: "בית", anagram: "" });
  });

  it("never throws on malformed input", () => {
    expect(decodeQueryToState("%%%&&&==")).toEqual({ rack: "", anagram: "" });
  });
});

describe("buildShareUrl", () => {
  const loc = {
    origin: "https://example.com",
    pathname: "/anagrams/",
    hash: "",
  } as Location;

  it("appends the query when state is non-empty", () => {
    expect(buildShareUrl({ rack: "שלום", anagram: "" }, loc)).toBe(
      `https://example.com/anagrams/?q=${encodeURIComponent("שלום")}`,
    );
  });

  it("omits the query for empty state and preserves the hash", () => {
    const withHash = { ...loc, hash: "#top" } as Location;
    expect(buildShareUrl({ rack: "", anagram: "" }, withHash)).toBe(
      "https://example.com/anagrams/#top",
    );
  });
});
