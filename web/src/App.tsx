import { useEffect, useMemo, useRef, useState } from "react";
import { TileBoard, type PlacedTile } from "./components/TileBoard";
import { preprocessWordList } from "./lib/dictionary";
import {
  keepHebrewLetters,
  normalizeFinalLetters,
  restoreFinalLettersForDisplay,
} from "./lib/hebrew";
import {
  findMultiWordAnagrams,
  MULTI_WORD_DEFAULT_MAX_INPUT_LETTERS,
  type MultiWordResult,
} from "./lib/multiwordAnagrams";
import { decodeQueryToState, encodeStateToQuery } from "./lib/urlState";
import {
  APP_FOOTER,
  APP_TAGLINE,
  APP_TITLE,
  APP_VERSION,
  CLEAR_ARIA,
  INPUT_ARIA,
  INPUT_PLACEHOLDER,
  NEXT_BUTTON_LABEL,
  STATUS_DICT_ERROR,
  STATUS_LOADING,
  STATUS_NO_MATCHES,
  statusCounter,
  statusTooLong,
} from "./strings";

const DICT_URL = `${import.meta.env.BASE_URL}hebrew_dict.txt`;

// Final-letter normalization is always on: the bundled hebrew_dict.txt uses
// base forms (מ, נ, …) at word ends, so without it common words like "שלום"
// would match nothing. The lib functions stay opt-in; the UI has no toggle.
const NORMALIZE_FINALS = true;

type DictState =
  | { status: "loading" }
  | { status: "ready"; raw: string }
  | { status: "error" };

/** Fisher–Yates shuffle of 0..n-1 — the random order "next" walks through. */
function shuffledIndices(n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Assign the typed tiles to the letters of a combination. Both sides are the
 * same letter multiset (exact anagram), compared in normalized base form;
 * each tile keeps its identity so the board can animate it to its new spot.
 * Displayed glyphs come from the combination words with final letters
 * restored, so a tile typed as ם may render as מ mid-word and vice versa.
 */
function arrangeTiles(
  typedLetters: string,
  comboWords: readonly string[],
): PlacedTile[][] {
  const queues = new Map<string, number[]>();
  [...typedLetters].forEach((ch, id) => {
    const key = normalizeFinalLetters(ch);
    const queue = queues.get(key);
    if (queue) queue.push(id);
    else queues.set(key, [id]);
  });
  return comboWords.map((word) => {
    const display = restoreFinalLettersForDisplay(word);
    return [...word].map((ch, i) => {
      const id = queues.get(normalizeFinalLetters(ch))!.shift()!;
      return { id, char: [...display][i] };
    });
  });
}

/** The idle arrangement: the letters as typed, one row per typed word. */
function typedArrangement(rack: string): PlacedTile[][] {
  let id = 0;
  return rack
    .split(/\s+/)
    .map((part) => keepHebrewLetters(part))
    .filter((part) => part !== "")
    .map((part) => [...part].map((ch) => ({ id: id++, char: ch })));
}

const INITIAL_RACK =
  typeof window !== "undefined"
    ? decodeQueryToState(window.location.search).rack
    : "";

export default function App() {
  const [rack, setRack] = useState(INITIAL_RACK);
  const [dictState, setDictState] = useState<DictState>({ status: "loading" });
  const [step, setStep] = useState(-1); // -1 = no combination revealed yet
  const [noMatches, setNoMatches] = useState(false);
  const [shakeNonce, setShakeNonce] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(DICT_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setDictState({ status: "ready", raw: text });
      })
      .catch(() => {
        if (!cancelled) setDictState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Mirror the rack into the URL (replaceState — no history spam).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = encodeStateToQuery({ rack });
    const next = query
      ? `${window.location.pathname}?${query}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.replaceState(null, "", next);
  }, [rack]);

  const preprocessed = useMemo<string[] | null>(() => {
    if (dictState.status !== "ready") return null;
    return preprocessWordList(dictState.raw, {
      minLength: 2,
      normalizeFinals: NORMALIZE_FINALS,
    });
  }, [dictState]);

  // The letters as typed (finals preserved for display) and the normalized
  // form the search runs on.
  const typedLetters = keepHebrewLetters(rack);
  const searchKey = normalizeFinalLetters(typedLetters);
  const tooLong = searchKey.length > MULTI_WORD_DEFAULT_MAX_INPUT_LETTERS;

  const combos = useMemo<MultiWordResult[]>(() => {
    if (!preprocessed || searchKey === "" || tooLong) return [];
    return findMultiWordAnagrams(searchKey, preprocessed, {
      minWords: 1,
    }).filter(
      // The input spelled identically back at you isn't a "match".
      (combo) => !(combo.words.length === 1 && combo.words[0] === searchKey),
    );
  }, [preprocessed, searchKey, tooLong]);

  const order = useMemo(() => shuffledIndices(combos.length), [combos]);

  // New letters → back to the un-revealed state.
  useEffect(() => {
    setStep(-1);
    setNoMatches(false);
  }, [searchKey]);

  function handleNext() {
    if (combos.length === 0) {
      setNoMatches(searchKey !== "");
      setShakeNonce((n) => n + 1);
      return;
    }
    setStep((s) => s + 1);
  }

  const combo = step >= 0 && combos.length > 0 ? combos[order[step % order.length]] : null;
  const words = useMemo<PlacedTile[][]>(
    () => (combo ? arrangeTiles(typedLetters, combo.words) : typedArrangement(rack)),
    [combo, typedLetters, rack],
  );

  let status = "";
  if (dictState.status === "loading") status = STATUS_LOADING;
  else if (dictState.status === "error") status = STATUS_DICT_ERROR;
  else if (tooLong) status = statusTooLong(MULTI_WORD_DEFAULT_MAX_INPUT_LETTERS);
  else if (noMatches) status = STATUS_NO_MATCHES;
  else if (combo) status = statusCounter((step % order.length) + 1, combos.length);

  return (
    <div className="table">
      <header className="brand">
        <h1 className="brand__title" aria-label={APP_TITLE}>
          {[...APP_TITLE].map((ch, i) => (
            <span
              className="tile tile--mini"
              key={i}
              aria-hidden="true"
              style={{ "--jitter": `${((i * 7919 + 3) % 7) - 3}deg` } as React.CSSProperties}
            >
              {ch}
            </span>
          ))}
        </h1>
        <p className="brand__tagline">{APP_TAGLINE}</p>
      </header>

      <main className="play">
        <form
          className="rack"
          onSubmit={(e) => {
            e.preventDefault();
            handleNext();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            dir="rtl"
            value={rack}
            onChange={(e) => setRack(e.target.value)}
            placeholder={INPUT_PLACEHOLDER}
            aria-label={INPUT_ARIA}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
          />
          {rack !== "" && (
            <button
              type="button"
              className="rack__clear"
              aria-label={CLEAR_ARIA}
              onClick={() => {
                setRack("");
                inputRef.current?.focus();
              }}
            >
              ×
            </button>
          )}
        </form>

        <button
          type="button"
          className="next-btn"
          onClick={handleNext}
          disabled={dictState.status !== "ready" || typedLetters === ""}
        >
          {NEXT_BUTTON_LABEL}
        </button>

        <TileBoard words={words} shakeNonce={shakeNonce} />

        <p className="status" aria-live="polite">
          {status}
        </p>
      </main>

      <footer className="footer">
        <span>{APP_FOOTER}</span>
        <span className="footer__version" aria-label={`גרסה ${APP_VERSION}`}>
          v{APP_VERSION}
        </span>
      </footer>
    </div>
  );
}
