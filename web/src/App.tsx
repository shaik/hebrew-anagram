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
  isRequiredWordSatisfiable,
  MULTI_WORD_DEFAULT_MAX_INPUT_LETTERS,
  type MultiWordResult,
} from "./lib/multiwordAnagrams";
import { buildShareUrl, decodeQueryToState, encodeStateToQuery } from "./lib/urlState";
import {
  APP_FOOTER,
  APP_TAGLINE,
  APP_TITLE,
  APP_VERSION,
  CLEAR_ARIA,
  FIXED_CLEAR_ARIA,
  FIXED_INPUT_ARIA,
  FIXED_INVALID_ARIA,
  FIXED_PLACEHOLDER,
  FIXED_TOGGLE_LABEL,
  INPUT_ARIA,
  INPUT_PLACEHOLDER,
  NEXT_BUTTON_LABEL,
  PREV_BUTTON_ARIA,
  REORDER_HINT,
  SHARE_ARIA,
  SHARE_COPIED,
  SHARE_LABEL,
  shareText,
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

const INITIAL_FROM_URL =
  typeof window !== "undefined"
    ? decodeQueryToState(window.location.search)
    : { rack: "", fixedWord: "", anagram: "" };

/** True iff the two word lists contain the same words (order-insensitive). */
function sameWordMultiset(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return [...a].sort().join(" ") === [...b].sort().join(" ");
}

/**
 * Permutation that maps `engineWords` onto the order of `wantedWords`
 * (same multiset, possibly with duplicates).
 */
function permutationFor(
  engineWords: readonly string[],
  wantedWords: readonly string[],
): number[] {
  const used = new Set<number>();
  return wantedWords.map((w) => {
    const i = engineWords.findIndex((ew, idx) => ew === w && !used.has(idx));
    used.add(i);
    return i;
  });
}

export default function App() {
  const [rack, setRack] = useState(INITIAL_FROM_URL.rack);
  const [fixedWord, setFixedWord] = useState(INITIAL_FROM_URL.fixedWord);
  const [showFixed, setShowFixed] = useState(INITIAL_FROM_URL.fixedWord !== "");
  const [dictState, setDictState] = useState<DictState>({ status: "loading" });
  const [step, setStep] = useState(-1); // -1 = no combination revealed yet
  const [wordOrder, setWordOrder] = useState<number[] | null>(null);
  const [noMatches, setNoMatches] = useState(false);
  const [shakeNonce, setShakeNonce] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>();
  // An anagram carried by the opened link, applied once the dictionary loads.
  const pendingAnagram = useRef(INITIAL_FROM_URL.anagram);

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

  // Mirror the rack + revealed combination into the URL (replaceState — no
  // history spam). Declared below, after `comboBase` is derived; see there.

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

  // The fixed word in search form. Non-empty → every combination contains it.
  const fixedKey = normalizeFinalLetters(keepHebrewLetters(fixedWord));
  const fixedInvalid =
    fixedKey !== "" &&
    searchKey !== "" &&
    !tooLong &&
    !isRequiredWordSatisfiable(fixedKey, searchKey);

  const combos = useMemo<MultiWordResult[]>(() => {
    if (!preprocessed || searchKey === "" || tooLong) return [];
    return findMultiWordAnagrams(searchKey, preprocessed, {
      minWords: 1,
      requiredWord: fixedKey || undefined,
    }).filter(
      // The input spelled identically back at you isn't a "match".
      (combo) => !(combo.words.length === 1 && combo.words[0] === searchKey),
    );
  }, [preprocessed, searchKey, tooLong, fixedKey]);

  const order = useMemo(() => shuffledIndices(combos.length), [combos]);

  // New letters or a new constraint → back to the un-revealed state.
  useEffect(() => {
    setStep(-1);
    setNoMatches(false);
    setWordOrder(null);
  }, [searchKey, fixedKey]);

  // A shared link may carry the sender's revealed combination — once the
  // dictionary is in and combos exist, jump straight to it, in the sender's
  // word order. Runs at most once per page load.
  useEffect(() => {
    if (pendingAnagram.current === "" || combos.length === 0) return;
    const wanted = pendingAnagram.current
      .split(/\s+/)
      .map((w) => normalizeFinalLetters(keepHebrewLetters(w)))
      .filter((w) => w !== "");
    pendingAnagram.current = "";
    const idx = combos.findIndex((c) => sameWordMultiset(c.words, wanted));
    if (idx < 0) return;
    setStep(order.indexOf(idx));
    setWordOrder(permutationFor(combos[idx].words, wanted));
  }, [combos, order]);

  function handleNext() {
    if (combos.length === 0) {
      setNoMatches(searchKey !== "");
      setShakeNonce((n) => n + 1);
      return;
    }
    setStep((s) => s + 1);
    setWordOrder(null); // each reveal starts in the engine's word order
  }

  function handlePrev() {
    if (step < 1) return;
    setStep((s) => s - 1);
    setWordOrder(null);
  }

  // Enter in either input reveals the next combination. The form never
  // implicitly submits (it has two inputs and no submit button), so each
  // input handles the key itself. On touch devices Enter also blurs the
  // input so the keyboard closes and the board is visible; on desktop
  // focus stays for Enter-spamming.
  function handleEnterKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (window.matchMedia("(pointer: coarse)").matches) {
      e.currentTarget.blur();
    }
    handleNext();
  }

  const combo = step >= 0 && combos.length > 0 ? combos[order[step % order.length]] : null;

  // The combination's words in the user's drag order (engine order until
  // the user drags).
  const orderedWords = useMemo<readonly string[] | null>(() => {
    if (!combo) return null;
    if (!wordOrder || wordOrder.length !== combo.words.length) return combo.words;
    return wordOrder.map((i) => combo.words[i]);
  }, [combo, wordOrder]);

  const words = useMemo<PlacedTile[][]>(
    () => (orderedWords ? arrangeTiles(typedLetters, orderedWords) : typedArrangement(rack)),
    [orderedWords, typedLetters, rack],
  );

  function handleReorderWords(from: number, to: number) {
    setWordOrder((prev) => {
      const current =
        prev && combo && prev.length === combo.words.length
          ? [...prev]
          : Array.from({ length: combo?.words.length ?? 0 }, (_, i) => i);
      const [moved] = current.splice(from, 1);
      current.splice(to, 0, moved);
      return current;
    });
  }

  // The revealed combination in the user's order, dictionary base form —
  // what travels in the URL so the link opens on the same board.
  const comboBase = orderedWords ? orderedWords.join(" ") : "";

  // Mirror the rack + fixed word + revealed combination into the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = encodeStateToQuery({ rack, fixedWord, anagram: comboBase });
    const next = query
      ? `${window.location.pathname}?${query}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.replaceState(null, "", next);
  }, [rack, fixedWord, comboBase]);

  async function handleShare() {
    const letters = rack.trim();
    const url = buildShareUrl({ rack, fixedWord, anagram: comboBase });
    const text = shareText(letters);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: APP_TITLE, text, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — nothing to do.
    }
  }

  let status = "";
  if (dictState.status === "loading") status = STATUS_LOADING;
  else if (dictState.status === "error") status = STATUS_DICT_ERROR;
  else if (tooLong) status = statusTooLong(MULTI_WORD_DEFAULT_MAX_INPUT_LETTERS);
  else if (noMatches) status = STATUS_NO_MATCHES;
  else if (combo) status = statusCounter((step % order.length) + 1, combos.length);

  // Row index of the fixed word on the board, for the golden highlight.
  const lockedRow =
    fixedKey !== "" && orderedWords ? orderedWords.indexOf(fixedKey) : -1;

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
        <form className="rack-area" onSubmit={(e) => e.preventDefault()}>
          <div className="rack">
            <input
              ref={inputRef}
              type="text"
              dir="rtl"
              value={rack}
              onChange={(e) => setRack(e.target.value)}
              onKeyDown={handleEnterKey}
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
          </div>

          {showFixed ? (
            <div className={"fixed-rack" + (fixedInvalid ? " fixed-rack--invalid" : "")}>
              <svg
                className="fixed-rack__lock"
                viewBox="0 0 16 16"
                aria-hidden="true"
                focusable="false"
              >
                <rect
                  x="3.5"
                  y="7"
                  width="9"
                  height="6.5"
                  rx="1.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="text"
                dir="rtl"
                value={fixedWord}
                onChange={(e) => setFixedWord(e.target.value)}
                onKeyDown={handleEnterKey}
                placeholder={FIXED_PLACEHOLDER}
                aria-label={FIXED_INPUT_ARIA}
                aria-invalid={fixedInvalid}
                title={fixedInvalid ? FIXED_INVALID_ARIA : undefined}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                autoFocus={fixedWord === ""}
              />
              <button
                type="button"
                className="fixed-rack__clear"
                aria-label={FIXED_CLEAR_ARIA}
                onClick={() => {
                  setFixedWord("");
                  setShowFixed(false);
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="fixed-toggle"
              onClick={() => setShowFixed(true)}
            >
              {FIXED_TOGGLE_LABEL}
            </button>
          )}
        </form>

        <div className="controls">
          <button
            type="button"
            className="next-btn"
            onClick={handleNext}
            disabled={dictState.status !== "ready" || typedLetters === ""}
          >
            {NEXT_BUTTON_LABEL}
          </button>
          <button
            type="button"
            className="back-btn"
            onClick={handlePrev}
            disabled={step < 1}
            aria-label={PREV_BUTTON_ARIA}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path
                d="M6 3.5 10.5 8 6 12.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <TileBoard
          words={words}
          shakeNonce={shakeNonce}
          lockedRow={lockedRow}
          onReorderWords={combo && combo.words.length > 1 ? handleReorderWords : undefined}
        />

        <p className="status" aria-live="polite">
          {status}
        </p>

        {combo && combo.words.length > 1 && (
          <p className="reorder-hint">{REORDER_HINT}</p>
        )}
      </main>

      <button
        type="button"
        className="share-btn"
        onClick={handleShare}
        disabled={typedLetters === ""}
        aria-label={SHARE_ARIA}
      >
        <svg
          className="share-btn__icon"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M8 1.5v8M8 1.5 5.2 4.3M8 1.5l2.8 2.8M3 7.5v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {shareCopied ? SHARE_COPIED : SHARE_LABEL}
      </button>

      <footer className="footer">
        <span>{APP_FOOTER}</span>
        <span className="footer__version" aria-label={`גרסה ${APP_VERSION}`}>
          v{APP_VERSION}
        </span>
      </footer>
    </div>
  );
}
