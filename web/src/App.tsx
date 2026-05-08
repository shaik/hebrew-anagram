import { useEffect, useMemo, useState } from "react";
import { SearchForm } from "./components/SearchForm";
import { OptionsPanel, type OptionsState } from "./components/OptionsPanel";
import { ResultsList } from "./components/ResultsList";
import { MultiResultsList } from "./components/MultiResultsList";
import { EmptyState } from "./components/EmptyState";
import { findMatchingWords, preprocessWordList } from "./lib/dictionary";
import {
  normalizeFinalLetters,
  removeNiqqud,
  restoreFinalLettersForDisplay,
} from "./lib/hebrew";
import {
  findMultiWordAnagrams,
  MULTI_WORD_DEFAULT_MAX_INPUT_LETTERS,
  MULTI_WORD_DEFAULT_MAX_RESULTS,
  type MultiWordResult,
} from "./lib/multiwordAnagrams";
import { scoreWord } from "./lib/scoring";

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
  mode: "single",
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

  // Single memo that branches on mode. In single mode we expose both the
  // total count and the truncated/sorted display list. In multi mode we
  // expose the combinations (already capped to MULTI_WORD_DEFAULT_MAX_RESULTS
  // by the search itself) plus a wildcard-disabled flag for the UI.
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
      };

  const searchState = useMemo<SearchState>(() => {
    if (!preprocessed || trimmedRack === "") return { kind: "empty" };

    if (options.mode === "multi") {
      if (trimmedRack.includes(WILDCARD)) {
        return {
          kind: "multi",
          combos: [],
          wildcardDisabled: true,
          inputTooLong: false,
        };
      }
      // Recompute the cleaned-input letter count to surface a UI-level
      // explanation when the search itself short-circuits on length.
      const cleanLetters = removeNiqqud(trimmedRack).replace(/\s+/g, "").length;
      if (cleanLetters > MULTI_WORD_DEFAULT_MAX_INPUT_LETTERS) {
        return {
          kind: "multi",
          combos: [],
          wildcardDisabled: false,
          inputTooLong: true,
        };
      }
      const effectiveRack = options.normalizeFinals
        ? normalizeFinalLetters(trimmedRack)
        : trimmedRack;
      const combos = findMultiWordAnagrams(effectiveRack, preprocessed);
      return {
        kind: "multi",
        combos,
        wildcardDisabled: false,
        inputTooLong: false,
      };
    }

    const effectiveRack = options.normalizeFinals
      ? normalizeFinalLetters(trimmedRack)
      : trimmedRack;
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
      body = (
        <EmptyState
          variant="no-results"
          message={
            "אנגרמות מרובות מילים אינן תומכות בג'וקר (?). הסירו את הסימן, או חזרו למצב מילים בודדות."
          }
        />
      );
    } else if (searchState.inputTooLong) {
      body = (
        <EmptyState
          variant="no-results"
          message={`קלט ארוך מדי לחיפוש מהיר. נסו עד ${MULTI_WORD_DEFAULT_MAX_INPUT_LETTERS} אותיות (לאחר התעלמות מרווחים), או עברו למצב מילים בודדות.`}
        />
      );
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

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">אנגרמות בעברית</h1>
        <p className="app__tagline">חיפוש מילים מהאותיות שלך — רץ בדפדפן, ללא שרת.</p>
      </header>

      <main className="app__main">
        <SearchForm
          value={rack}
          onChange={setRack}
          onClear={() => setRack("")}
          disabled={!dictReady}
        />
        <OptionsPanel options={options} onChange={setOptions} disabled={!dictReady} />
        {options.mode === "multi" && (
          <p className="mode-explainer">
            צירופים שמשתמשים בכל האותיות שלך <strong>בדיוק</strong>. רווחים
            מתעלמים. עד {MULTI_WORD_DEFAULT_MAX_RESULTS.toLocaleString("he-IL")}{" "}
            תוצאות.
          </p>
        )}
        {body}
      </main>

      <footer className="app__footer">
        <span>POC לאימות workflow רב־סוכני · המילון נטען רק בדפדפן · קוד פתוח</span>
      </footer>
    </div>
  );
}

function ResultsHeader({ total, shown }: { total: number; shown: number }) {
  const truncated = shown < total;
  return (
    <div className="results-header" aria-live="polite">
      <strong>{total.toLocaleString("he-IL")}</strong>{" "}
      {total === 1 ? "מילה תואמת" : "מילים תואמות"}
      {truncated && (
        <span className="results-header__note">
          {" "}
          (מוצגות {shown.toLocaleString("he-IL")} ראשונות)
        </span>
      )}
    </div>
  );
}

function MultiResultsHeader({ count, cap }: { count: number; cap: number }) {
  const capped = count >= cap;
  return (
    <div className="results-header" aria-live="polite">
      <strong>{count.toLocaleString("he-IL")}</strong>{" "}
      {count === 1 ? "צירוף" : "צירופים"}
      {capped && (
        <span className="results-header__note"> (הוגבל ל־{cap.toLocaleString("he-IL")})</span>
      )}
    </div>
  );
}
