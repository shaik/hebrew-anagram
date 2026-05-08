export type SortOrder = "longest" | "shortest" | "dict";

export interface OptionsState {
  minLength: number;
  normalizeFinals: boolean;
  sort: SortOrder;
}

interface OptionsPanelProps {
  options: OptionsState;
  onChange: (next: OptionsState) => void;
  disabled?: boolean;
}

const MIN_LENGTH_CHOICES = [2, 3, 4, 5, 6] as const;

export function OptionsPanel({ options, onChange, disabled }: OptionsPanelProps) {
  return (
    <section className="options" aria-label="אפשרויות חיפוש">
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
