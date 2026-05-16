import type { OptionsState, SearchMode, SortOrder } from "../components/OptionsPanel";

export interface AppUrlState {
  rack: string;
  fixedWord: string;
  options: OptionsState;
}

// Defaults must match the App's DEFAULT_OPTIONS. Kept here too so encode() can
// omit params that match defaults and decode() can fill in missing ones — the
// two files share this contract via tests, not via import (to avoid a cycle).
export const URL_STATE_DEFAULTS: AppUrlState = {
  rack: "",
  fixedWord: "",
  options: {
    minLength: 2,
    normalizeFinals: true,
    sort: "longest",
    mode: "multi",
  },
};

const MODES: readonly SearchMode[] = ["single", "multi", "crossword"];
const SORTS: readonly SortOrder[] = ["longest", "shortest", "dict"];

/**
 * Encode app state into a URL query string (without the leading `?`).
 *
 * Params that match defaults are omitted to keep shared URLs short. Hebrew
 * letters are passed through `URLSearchParams` which percent-encodes them;
 * browsers render the decoded form in the address bar.
 */
export function encodeStateToQuery(state: AppUrlState): string {
  const params = new URLSearchParams();
  const d = URL_STATE_DEFAULTS;

  if (state.rack !== d.rack) params.set("q", state.rack);
  if (state.fixedWord !== d.fixedWord) params.set("f", state.fixedWord);
  if (state.options.mode !== d.options.mode) params.set("m", state.options.mode);
  if (state.options.minLength !== d.options.minLength)
    params.set("min", String(state.options.minLength));
  if (state.options.normalizeFinals !== d.options.normalizeFinals)
    params.set("nf", state.options.normalizeFinals ? "1" : "0");
  if (state.options.sort !== d.options.sort) params.set("sort", state.options.sort);

  return params.toString();
}

/**
 * Decode a URL query string (with or without leading `?`) into app state.
 *
 * Unknown or malformed values fall back to defaults rather than throwing —
 * shareable URLs should never crash the app even if hand-edited.
 */
export function decodeQueryToState(query: string): AppUrlState {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  const d = URL_STATE_DEFAULTS;

  const modeRaw = params.get("m");
  const mode = MODES.includes(modeRaw as SearchMode)
    ? (modeRaw as SearchMode)
    : d.options.mode;

  const sortRaw = params.get("sort");
  const sort = SORTS.includes(sortRaw as SortOrder)
    ? (sortRaw as SortOrder)
    : d.options.sort;

  const minRaw = params.get("min");
  const minParsed = minRaw === null ? NaN : Number(minRaw);
  const minLength =
    Number.isFinite(minParsed) && minParsed >= 1 && minParsed <= 20
      ? Math.trunc(minParsed)
      : d.options.minLength;

  const nfRaw = params.get("nf");
  const normalizeFinals =
    nfRaw === "1" ? true : nfRaw === "0" ? false : d.options.normalizeFinals;

  return {
    rack: params.get("q") ?? d.rack,
    fixedWord: params.get("f") ?? d.fixedWord,
    options: { mode, minLength, normalizeFinals, sort },
  };
}

/**
 * Build a full shareable URL based on the current `window.location` plus the
 * given state. Replaces the query string; preserves origin, pathname, and
 * hash so deployments under a project subpath keep working.
 */
export function buildShareUrl(state: AppUrlState, location: Location = window.location): string {
  const query = encodeStateToQuery(state);
  const base = `${location.origin}${location.pathname}`;
  const hash = location.hash || "";
  return query ? `${base}?${query}${hash}` : `${base}${hash}`;
}
