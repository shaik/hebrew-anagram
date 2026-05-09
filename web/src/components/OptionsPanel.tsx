export type SortOrder = "longest" | "shortest" | "dict";
export type SearchMode = "single" | "multi" | "crossword";

export interface OptionsState {
  minLength: number;
  normalizeFinals: boolean;
  sort: SortOrder;
  mode: SearchMode;
}

interface OptionsPanelProps {
  options: OptionsState;
  onChange: (next: OptionsState) => void;
  disabled?: boolean;
}

const MIN_LENGTH_CHOICES = [2, 3, 4, 5, 6] as const;

const MODE_LABELS: Record<SearchMode, string> = {
  single: "מילים בודדות",
  multi: "אנגרמות מרובות מילים",
  crossword: "תבנית תשבץ",
};

export function OptionsPanel({ options, onChange, disabled }: OptionsPanelProps) {
  // Sort + min-length controls only matter for the single-word mode. Multi
  // mode has its own pipeline; crossword mode has fixed-length, position-
  // based matching.
  const showSingleControls = options.mode === "single";

  return (
    <section className="options" aria-label="אפשרויות חיפוש">
      <div
        className="options__row options__row--mode"
        role="radiogroup"
        aria-label="מצב חיפוש"
      >
        {(Object.keys(MODE_LABELS) as SearchMode[]).map((m) => {
          const active = options.mode === m;
          return (
            <button
              key={m}
              type="button"
              className={`options__mode${active ? " options__mode--active" : ""}`}
              onClick={() => onChange({ ...options, mode: m })}
              aria-pressed={active}
              disabled={disabled}
            >
              {MODE_LABELS[m]}
            </button>
          );
        })}
      </div>

      {showSingleControls && (
        <>
          <div className="options__row">
            <label className="options__label" htmlFor="min-length">
              אורך מינימלי
            </label>
            <select
              id="min-length"
              className="options__control"
              value={options.minLength}
              onChange={(e) => onChange({ ...options, minLength: Number(e.target.value) })}
              disabled={disabled}
            >
              {MIN_LENGTH_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n} אותיות ומעלה
                </option>
              ))}
            </select>
          </div>

          <div className="options__row">
            <label className="options__label" htmlFor="sort">
              מיון
            </label>
            <select
              id="sort"
              className="options__control"
              value={options.sort}
              onChange={(e) => onChange({ ...options, sort: e.target.value as SortOrder })}
              disabled={disabled}
            >
              <option value="longest">ארוכות תחילה</option>
              <option value="shortest">קצרות תחילה</option>
              <option value="dict">סדר המילון</option>
            </select>
          </div>
        </>
      )}

      <div className="options__row options__row--toggle">
        <label className="options__label" htmlFor="normalize-finals">
          התעלם מצורות סופיות (ך/כ, ם/מ ...)
        </label>
        <input
          id="normalize-finals"
          className="options__toggle"
          type="checkbox"
          checked={options.normalizeFinals}
          onChange={(e) => onChange({ ...options, normalizeFinals: e.target.checked })}
          disabled={disabled}
        />
      </div>
    </section>
  );
}
