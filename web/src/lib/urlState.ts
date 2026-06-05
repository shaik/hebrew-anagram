// URL state for the app: the typed letters (`q`) and, optionally, the
// currently revealed anagram (`a`, space-separated words in dictionary base
// form) — so a shared link opens with the same combination already on the
// board. Legacy params from the old multi-mode UI (m/min/nf/sort/f) are
// ignored.

export interface AppUrlState {
  rack: string;
  /** Space-separated revealed combination, or "" for none. */
  anagram: string;
}

/**
 * Encode app state into a URL query string (without the leading `?`).
 * Empty fields are omitted so the bare URL stays clean.
 */
export function encodeStateToQuery(state: AppUrlState): string {
  const params = new URLSearchParams();
  if (state.rack !== "") params.set("q", state.rack);
  if (state.anagram !== "") params.set("a", state.anagram);
  return params.toString();
}

/**
 * Decode a URL query string (with or without leading `?`) into app state.
 * Unknown params are ignored; malformed input falls back to defaults —
 * shareable URLs should never crash the app even if hand-edited.
 */
export function decodeQueryToState(query: string): AppUrlState {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  return { rack: params.get("q") ?? "", anagram: params.get("a") ?? "" };
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
