import { describe, expect, it } from "vitest";
import {
  buildShareUrl,
  decodeQueryToState,
  encodeStateToQuery,
  URL_STATE_DEFAULTS,
  type AppUrlState,
} from "./urlState";

function makeState(overrides: Partial<AppUrlState> = {}): AppUrlState {
  return {
    rack: overrides.rack ?? URL_STATE_DEFAULTS.rack,
    fixedWord: overrides.fixedWord ?? URL_STATE_DEFAULTS.fixedWord,
    options: { ...URL_STATE_DEFAULTS.options, ...(overrides.options ?? {}) },
  };
}

describe("encodeStateToQuery", () => {
  it("returns an empty string for the default state", () => {
    expect(encodeStateToQuery(URL_STATE_DEFAULTS)).toBe("");
  });

  it("encodes only fields that differ from the defaults", () => {
    const state = makeState({ rack: "שלום" });
    const q = encodeStateToQuery(state);
    expect(q).toContain("q=");
    expect(q).not.toContain("m=");
    expect(q).not.toContain("nf=");
    expect(q).not.toContain("sort=");
    expect(q).not.toContain("min=");
    expect(q).not.toContain("f=");
  });

  it("encodes the fixed word and mode together", () => {
    const state = makeState({
      rack: "הפועלאימפריה",
      fixedWord: "קר",
      options: { ...URL_STATE_DEFAULTS.options, mode: "multi" },
    });
    const q = encodeStateToQuery(state);
    expect(q).toContain("q=");
    expect(q).toContain("f=");
    // mode=multi is the default, so it should be omitted.
    expect(q).not.toContain("m=");
  });

  it("encodes nf=0 when the user disables final-letter normalization", () => {
    const state = makeState({
      options: { ...URL_STATE_DEFAULTS.options, normalizeFinals: false },
    });
    expect(encodeStateToQuery(state)).toBe("nf=0");
  });

  it("encodes single-mode settings", () => {
    const state = makeState({
      rack: "שלום",
      options: {
        mode: "single",
        minLength: 4,
        normalizeFinals: true,
        sort: "shortest",
      },
    });
    const params = new URLSearchParams(encodeStateToQuery(state));
    expect(params.get("q")).toBe("שלום");
    expect(params.get("m")).toBe("single");
    expect(params.get("min")).toBe("4");
    expect(params.get("sort")).toBe("shortest");
    expect(params.get("nf")).toBeNull();
  });
});

describe("decodeQueryToState", () => {
  it("returns defaults for an empty query", () => {
    expect(decodeQueryToState("")).toEqual(URL_STATE_DEFAULTS);
    expect(decodeQueryToState("?")).toEqual(URL_STATE_DEFAULTS);
  });

  it("accepts a leading `?` or none", () => {
    const withMark = decodeQueryToState("?q=שלום");
    const without = decodeQueryToState("q=שלום");
    expect(withMark).toEqual(without);
    expect(withMark.rack).toBe("שלום");
  });

  it("decodes percent-encoded Hebrew", () => {
    const encoded = encodeURIComponent("שלום");
    expect(decodeQueryToState(`q=${encoded}`).rack).toBe("שלום");
  });

  it("falls back to defaults on unknown mode/sort values", () => {
    const state = decodeQueryToState("m=bogus&sort=weird");
    expect(state.options.mode).toBe(URL_STATE_DEFAULTS.options.mode);
    expect(state.options.sort).toBe(URL_STATE_DEFAULTS.options.sort);
  });

  it("clamps min to a sane range and ignores garbage", () => {
    expect(decodeQueryToState("min=abc").options.minLength).toBe(2);
    expect(decodeQueryToState("min=-5").options.minLength).toBe(2);
    expect(decodeQueryToState("min=999").options.minLength).toBe(2);
    expect(decodeQueryToState("min=4").options.minLength).toBe(4);
    expect(decodeQueryToState("min=4.7").options.minLength).toBe(4);
  });

  it("treats nf=1 as true, nf=0 as false, anything else as default", () => {
    expect(decodeQueryToState("nf=1").options.normalizeFinals).toBe(true);
    expect(decodeQueryToState("nf=0").options.normalizeFinals).toBe(false);
    expect(decodeQueryToState("nf=").options.normalizeFinals).toBe(true);
    expect(decodeQueryToState("nf=yes").options.normalizeFinals).toBe(true);
  });
});

describe("encode/decode round-trip", () => {
  const cases: AppUrlState[] = [
    URL_STATE_DEFAULTS,
    makeState({ rack: "שלום" }),
    makeState({ rack: "הפועל אימפריה", fixedWord: "קר" }),
    makeState({
      rack: "??גד?",
      options: { mode: "crossword", minLength: 2, normalizeFinals: true, sort: "longest" },
    }),
    makeState({
      rack: "שלום",
      options: { mode: "single", minLength: 5, normalizeFinals: false, sort: "dict" },
    }),
  ];

  for (const s of cases) {
    it(`survives round-trip for ${JSON.stringify(s)}`, () => {
      expect(decodeQueryToState(encodeStateToQuery(s))).toEqual(s);
    });
  }
});

describe("buildShareUrl", () => {
  function fakeLocation(over: Partial<Location>): Location {
    return {
      origin: "https://example.com",
      pathname: "/",
      hash: "",
      ...over,
    } as Location;
  }

  it("returns origin+pathname when the state matches the defaults", () => {
    const url = buildShareUrl(URL_STATE_DEFAULTS, fakeLocation({}));
    expect(url).toBe("https://example.com/");
  });

  it("appends the encoded query when state differs", () => {
    const url = buildShareUrl(makeState({ rack: "שלום" }), fakeLocation({}));
    expect(url.startsWith("https://example.com/?q=")).toBe(true);
    expect(url).toContain("שלום".split("").map((c) => encodeURIComponent(c)).join(""));
  });

  it("preserves a project subpath", () => {
    const url = buildShareUrl(
      makeState({ rack: "שלום" }),
      fakeLocation({ pathname: "/anagram/" }),
    );
    expect(url.startsWith("https://example.com/anagram/?q=")).toBe(true);
  });

  it("preserves any existing hash fragment", () => {
    const url = buildShareUrl(
      makeState({ rack: "שלום" }),
      fakeLocation({ hash: "#about" }),
    );
    expect(url.endsWith("#about")).toBe(true);
  });
});
