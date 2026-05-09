import { useEffect, useMemo, useState } from "react";
import { SearchForm } from "./components/SearchForm";
import {
  OptionsPanel,
  type OptionsState,
} from "./components/OptionsPanel";
import { ResultsList } from "./components/ResultsList";
import { MultiResultsList } from "./components/MultiResultsList";
import { FixedWordField } from "./components/FixedWordField";
import { EmptyState } from "./components/EmptyState";
import { findMatchingWords, preprocessWordList } from "./lib/dictionary";
import {
  keepHebrewLetters,
  normalizeFinalLetters,
  restoreFinalLettersForDisplay,
} from "./lib/hebrew";
import {
  findMultiWordAnagrams,
  isRequiredWordSatisfiable,
  MULTI_WORD_DEFAULT_MAX_INPUT_LETTERS,
  MULTI_WORD_DEFAULT_MAX_RESULTS,
  type MultiWordResult,
} from "./lib/multiwordAnagrams";
import {
  findWordsByPattern,
  PATTERN_DEFAULT_MAX_RESULTS,
} from "./lib/patternSearch";
import { scoreWord } from "./lib/scoring";
import {
  APP_FOOTER,
  APP_TAGLINE,
  APP_TITLE,
  APP_VERSION,
  CROSSWORD_MODE_EXPLAINER,
  cappedNote,
  FIXED_WORD_INVALID,
  MULTI_RESULTS_LABEL,
  MULTI_WILDCARD_DISABLED_MSG,
  multiInputTooLongMsg,
  multiModeExplainer,
  PATTERN_RESULTS_LABEL,
  pluralize,
  SEARCH_FORM_COPY,
  shownNote,
  SINGLE_RESULTS_LABEL,
} from "./strings";

const DICT_URL = `${import.meta.env.BASE_URL}hebrew_dict.txt`;
const MAX_DISPLAYED = 500;
const WILDCARD = "?";

// Default normalizeFinals=true because the bundled hebrew_dict.txt uses base
// forms (מ, נ, …) instead of final forms (ם, ן, …) at word ends. With the
// toggle off, a user typing common words like "שלום" would match zero entries.
// The Python reference keeps it off for code-level clarity; the web UI is
// end-user-facing, so we flip the default here. Users can still turn it off
// in the Options panel.
const DEFAULT_OPTIONS: OptionsState = {
  minLength: 2,
  normalizeFinals: true,
  sort: "longest",
  mode: "multi",
};

type DictState =
  | { status: "loading" }
  | { status: "ready"; raw: string }
  | { status: "error"; message: string };

function sortResults(words: readonly string[], order: OptionsState["sort"]): string[] {
  if (order === "dict") return [...words];
  const copy = [...words];
  // Stable sort by length; fall back to dictionary order for ties.
  if (order === "longest") copy.sort((a, b) => b.length - a.length);
  else copy.sort((a, b) => a.length - b.length);
  return copy;
}

export default function App() {
  const [rack, setRack] = useState("");
  const [fixedWord, setFixedWord] = useState("");
  const [options, setOptions] = useState<OptionsState>(DEFAULT_OPTIONS);
  const [dictState, setDictState] = useState<DictState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(DICT_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        setDictState({ status: "ready", raw: text });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setDictState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
    // The fetch URL never changes after first render.
  }, []);

  // Preprocessed dictionary depends on the raw text + the finals toggle only.
  // Filtering one-letter entries happens here (load-time policy: minLength=2).
  const preprocessed = useMemo<string[] | null>(() => {
    if (dictState.status !== "ready") return null;
    return preprocessWordList(dictState.raw, {
      minLength: 2,
      normalizeFinals: options.normalizeFinals,
    });
  }, [dictState, options.normalizeFinals]);

  const trimmedRack = rack.trim();
  const trimmedFixed = fixedWord.trim();

  // Sanitize rack/fixed for the anagram modes: drop everything that isn't a
  // Hebrew letter so users can paste loosely (spaces, commas, dashes, ASCII,
  // niqqud, etc. all silently disappear). Single mode preserves `?` as the
  // wildcard. Crossword mode is left untouched — non-Hebrew chars are its
  // wildcards by design.
  const sanitizedRack =
    options.mode === "crossword"
      ? trimmedRack
      : options.mode === "single"
        ? keepHebrewLetters(trimmedRack, WILDCARD)
        : keepHebrewLetters(trimmedRack);
  const sanitizedFixed = keepHebrewLetters(trimmedFixed);

  // Decide whether the multi-mode "fixed word" is valid for the current
  // rack. Empty fixed → no constraint (valid). Non-empty fixed must be a
  // subset of the rack's letter multiset.
  const fixedWordValid = useMemo(() => {
    if (options.mode !== "multi") return true;
    // Compare on the SANITIZED forms so that stray punctuation in the user's
    // typing doesn't trigger spurious "not a subset" errors.
    if (sanitizedFixed === "" || sanitizedRack === "") return true;
    const rackForCheck = options.normalizeFinals
      ? normalizeFinalLetters(sanitizedRack)
      : sanitizedRack;
    const fixedForCheck = options.normalizeFinals
      ? normalizeFinalLetters(sanitizedFixed)
      : sanitizedFixed;
    return isRequiredWordSatisfiable(fixedForCheck, rackForCheck);
  }, [options.mode, options.normalizeFinals, sanitizedFixed, sanitizedRack]);

  type SearchState =
    | { kind: "empty" }
    | {
        kind: "single";
        results: { word: string; score: number }[];
        totalMatches: number;
      }
    | {
        kind: "multi";
        combos: MultiWordResult[];
        wildcardDisabled: boolean;
        inputTooLong: boolean;
        fixedInvalid: boolean;
      }
    | {
        kind: "crossword";
        results: { word: string; score: number }[];
        totalMatches: number;
      };

  const searchState = useMemo<SearchState>(() => {
    if (!preprocessed) return { kind: "empty" };

    // Crossword mode is driven entirely by the rack input as the pattern.
    // We use the raw (non-sanitized) rack here because non-Hebrew characters
    // ARE the wildcard in this mode.
    if (options.mode === "crossword") {
      if (trimmedRack === "") return { kind: "empty" };
      const matched = findWordsByPattern(trimmedRack, preprocessed, {
        normalizeFinals: options.normalizeFinals,
      });
      if (matched.length === 0 && trimmedRack.length === 0) return { kind: "empty" };
      const display = matched.map((word) => ({
        word: restoreFinalLettersForDisplay(word),
        score: scoreWord(word),
      }));
      return { kind: "crossword", results: display, totalMatches: matched.length };
    }

    // For single + multi modes, the search runs against the sanitized rack
    // (Hebrew letters only, plus `?` in single mode for wildcard support).
    if (sanitizedRack === "") return { kind: "empty" };

    if (options.mode === "multi") {
      if (sanitizedRack.length > MULTI_WORD_DEFAULT_MAX_INPUT_LETTERS) {
        return {
          kind: "multi",
          combos: [],
          wildcardDisabled: false,
          inputTooLong: true,
          fixedInvalid: false,
        };
      }
      const effectiveRack = options.normalizeFinals
        ? normalizeFinalLetters(sanitizedRack)
        : sanitizedRack;
      const effectiveFixed =
        sanitizedFixed === ""
          ? ""
          : options.normalizeFinals
            ? normalizeFinalLetters(sanitizedFixed)
            : sanitizedFixed;
      if (effectiveFixed !== "" && !isRequiredWordSatisfiable(effectiveFixed, effectiveRack)) {
        return {
          kind: "multi",
          combos: [],
          wildcardDisabled: false,
          inputTooLong: false,
          fixedInvalid: true,
        };
      }
      const combos = findMultiWordAnagrams(effectiveRack, preprocessed, {
        requiredWord: effectiveFixed || undefined,
      });
      return {
        kind: "multi",
        combos,
        wildcardDisabled: false,
        inputTooLong: false,
        fixedInvalid: false,
      };
    }

    // Single-word mode.
    const effectiveRack = options.normalizeFinals
      ? normalizeFinalLetters(sanitizedRack)
      : sanitizedRack;
    const matched = findMatchingWords(effectiveRack, preprocessed).filter(
      (w) => w.length >= options.minLength,
    );
    const sorted = sortResults(matched, options.sort);
    const display = sorted.slice(0, MAX_DISPLAYED).map((word) => ({
      word: restoreFinalLettersForDisplay(word),
      score: scoreWord(word),
    }));
    return { kind: "single", results: display, totalMatches: matched.length };
  }, [
    preprocessed,
    trimmedRack,
    sanitizedRack,
    sanitizedFixed,
    options.mode,
    options.minLength,
    options.normalizeFinals,
    options.sort,
  ]);

  const dictReady = dictState.status === "ready";
  const showLoading = dictState.status === "loading";
  const showError = dictState.status === "error";

  let body;
  if (showLoading) {
    body = <EmptyState variant="loading" />;
  } else if (showError) {
    body = (
      <EmptyState
        variant="error"
        message={dictState.status === "error" ? dictState.message : undefined}
      />
    );
  } else if (searchState.kind === "empty") {
    body = <EmptyState variant="idle" />;
  } else if (searchState.kind === "multi") {
    if (searchState.wildcardDisabled) {
      body = <EmptyState variant="no-results" message={MULTI_WILDCARD_DISABLED_MSG} />;
    } else if (searchState.inputTooLong) {
      body = (
        <EmptyState
          variant="no-results"
          message={multiInputTooLongMsg(MULTI_WORD_DEFAULT_MAX_INPUT_LETTERS)}
        />
      );
    } else if (searchState.fixedInvalid) {
      // The FixedWordField shows the precise error; suppress the generic
      // empty-state title here to avoid duplicate messaging.
      body = null;
    } else if (searchState.combos.length === 0) {
      body = <EmptyState variant="no-results" />;
    } else {
      body = (
        <>
          <MultiResultsHeader
            count={searchState.combos.length}
            cap={MULTI_WORD_DEFAULT_MAX_RESULTS}
          />
          <MultiResultsList combos={searchState.combos} />
        </>
      );
    }
  } else if (searchState.kind === "crossword") {
    if (searchState.results.length === 0) {
      body = <EmptyState variant="no-results" />;
    } else {
      body = (
        <>
          <PatternResultsHeader
            count={searchState.totalMatches}
            cap={PATTERN_DEFAULT_MAX_RESULTS}
          />
          <ResultsList results={searchState.results} />
        </>
      );
    }
  } else if (searchState.results.length === 0) {
    body = <EmptyState variant="no-results" />;
  } else {
    body = (
      <>
        <ResultsHeader
          total={searchState.totalMatches}
          shown={searchState.results.length}
        />
        <ResultsList results={searchState.results} />
      </>
    );
  }

  const formCopy = SEARCH_FORM_COPY[options.mode];

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">{APP_TITLE}</h1>
        <p className="app__tagline">{APP_TAGLINE}</p>
      </header>

      <main className="app__main">
        <SearchForm
          value={rack}
          onChange={setRack}
          onClear={() => setRack("")}
          disabled={!dictReady}
          label={formCopy.label}
          placeholder={formCopy.placeholder}
          hint={formCopy.hint}
        />
        <OptionsPanel options={options} onChange={setOptions} disabled={!dictReady} />
        {options.mode === "multi" && (
          <FixedWordField
            value={fixedWord}
            onChange={setFixedWord}
            disabled={!dictReady}
            errorMessage={fixedWordValid ? undefined : FIXED_WORD_INVALID}
          />
        )}
        {options.mode === "multi" && (
          <p className="mode-explainer">{multiModeExplainer(MULTI_WORD_DEFAULT_MAX_RESULTS)}</p>
        )}
        {options.mode === "crossword" && (
          <p className="mode-explainer">{CROSSWORD_MODE_EXPLAINER}</p>
        )}
        {body}
      </main>

      <footer className="app__footer">
        <span>{APP_FOOTER}</span>
        <span className="app__version" aria-label={`גרסה ${APP_VERSION}`}>
          v{APP_VERSION}
        </span>
      </footer>
    </div>
  );
}

function ResultsHeader({ total, shown }: { total: number; shown: number }) {
  const truncated = shown < total;
  return (
    <div className="results-header" aria-live="polite">
      <strong>{total.toLocaleString("he-IL")}</strong>{" "}
      {pluralize(total, SINGLE_RESULTS_LABEL)}
      {truncated && (
        <span className="results-header__note"> {shownNote(shown)}</span>
      )}
    </div>
  );
}

function MultiResultsHeader({ count, cap }: { count: number; cap: number }) {
  const capped = count >= cap;
  return (
    <div className="results-header" aria-live="polite">
      <strong>{count.toLocaleString("he-IL")}</strong>{" "}
      {pluralize(count, MULTI_RESULTS_LABEL)}
      {capped && (
        <span className="results-header__note"> {cappedNote(cap)}</span>
      )}
    </div>
  );
}

function PatternResultsHeader({ count, cap }: { count: number; cap: number }) {
  const capped = count >= cap;
  return (
    <div className="results-header" aria-live="polite">
      <strong>{count.toLocaleString("he-IL")}</strong>{" "}
      {pluralize(count, PATTERN_RESULTS_LABEL)}
      {capped && (
        <span className="results-header__note"> {cappedNote(cap)}</span>
      )}
    </div>
  );
}
