import { describe, expect, it } from "vitest";
import { buildShareUrl, decodeQueryToState, encodeStateToQuery } from "./urlState";

describe("encodeStateToQuery", () => {
  it("returns an empty string for an empty rack", () => {
    expect(encodeStateToQuery({ rack: "" })).toBe("");
  });

  it("encodes the rack as q", () => {
    const q = encodeStateToQuery({ rack: "שלום" });
    expect(q).toBe(`q=${encodeURIComponent("שלום")}`);
  });

  it("round-trips through decode", () => {
    const q = encodeStateToQuery({ rack: "שי כפיר" });
    expect(decodeQueryToState(q)).toEqual({ rack: "שי כפיר" });
  });
});

describe("decodeQueryToState", () => {
  it("returns an empty rack for an empty query", () => {
    expect(decodeQueryToState("")).toEqual({ rack: "" });
  });

  it("accepts a leading question mark", () => {
    expect(decodeQueryToState("?q=בית")).toEqual({ rack: "בית" });
  });

  it("ignores legacy and unknown params", () => {
    expect(
      decodeQueryToState("?q=בית&m=crossword&min=3&nf=0&sort=dict&f=קר&junk=1"),
    ).toEqual({ rack: "בית" });
  });

  it("never throws on malformed input", () => {
    expect(decodeQueryToState("%%%&&&==")).toEqual({ rack: "" });
  });
});

describe("buildShareUrl", () => {
  const loc = {
    origin: "https://example.com",
    pathname: "/anagrams/",
    hash: "",
  } as Location;

  it("appends the query when the rack is non-empty", () => {
    expect(buildShareUrl({ rack: "שלום" }, loc)).toBe(
      `https://example.com/anagrams/?q=${encodeURIComponent("שלום")}`,
    );
  });

  it("omits the query for an empty rack and preserves the hash", () => {
    const withHash = { ...loc, hash: "#top" } as Location;
    expect(buildShareUrl({ rack: "" }, withHash)).toBe(
      "https://example.com/anagrams/#top",
    );
  });
});
