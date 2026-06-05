// URL state for the app: the only shareable state is the typed letters.
// Encoded as `?q=…` so existing shared links (which used `q` for the rack)
// keep working; all other legacy params (m/min/nf/sort/f) are ignored.

export interface AppUrlState {
  rack: string;
}

/**
 * Encode app state into a URL query string (without the leading `?`).
 * An empty rack yields an empty string so the bare URL stays clean.
 */
export function encodeStateToQuery(state: AppUrlState): string {
  const params = new URLSearchParams();
  if (state.rack !== "") params.set("q", state.rack);
  return params.toString();
}

/**
 * Decode a URL query string (with or without leading `?`) into app state.
 * Unknown params are ignored; malformed input falls back to defaults —
 * shareable URLs should never crash the app even if hand-edited.
 */
export function decodeQueryToState(query: string): AppUrlState {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  return { rack: params.get("q") ?? "" };
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
