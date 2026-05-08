import { useEffect, useMemo, useState } from "react";
import { SearchForm } from "./components/SearchForm";
import { OptionsPanel, type OptionsState } from "./components/OptionsPanel";
import { ResultsList } from "./components/ResultsList";
import { EmptyState } from "./components/EmptyState";
import { findMatchingWords, preprocessWordList } from "./lib/dictionary";
import { normalizeFinalLetters } from "./lib/hebrew";
import { scoreWord } from "./lib/scoring";

const DICT_URL = `${import.meta.env.BASE_URL}hebrew_dict.txt`;
const MAX_DISPLAYED = 500;

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

  // Single pass: filter by rack + min length, then sort. We expose both the
  // total count and the truncated/sorted display list from the same memo so
  // we don't run findMatchingWords twice on every keystroke.
  const { results, totalMatches } = useMemo(() => {
    if (!preprocessed || trimmedRack === "") {
      return { results: [], totalMatches: 0 };
    }
    const effectiveRack = options.normalizeFinals
      ? normalizeFinalLetters(trimmedRack)
      : trimmedRack;
    const matched = findMatchingWords(effectiveRack, preprocessed).filter(
      (w) => w.length >= options.minLength,
    );
    const sorted = sortResults(matched, options.sort);
    const display = sorted
      .slice(0, MAX_DISPLAYED)
      .map((word) => ({ word, score: scoreWord(word) }));
    return { results: display, totalMatches: matched.length };
  }, [preprocessed, trimmedRack, options.minLength, options.normalizeFinals, options.sort]);

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
  } else if (trimmedRack === "") {
    body = <EmptyState variant="idle" />;
  } else if (results.length === 0) {
    body = <EmptyState variant="no-results" />;
  } else {
    body = (
      <>
        <ResultsHeader total={totalMatches} shown={results.length} />
        <ResultsList results={results} />
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
