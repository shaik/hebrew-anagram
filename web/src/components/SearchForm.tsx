interface SearchFormProps {
  value: string;
  onChange: (next: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function SearchForm({ value, onChange, onClear, disabled }: SearchFormProps) {
  return (
    <section className="search">
      <label htmlFor="rack" className="search__label">
        האותיות שלך
      </label>
      <div className="search__input-wrap">
        <input
          id="rack"
          className="search__input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          dir="rtl"
          lang="he"
          placeholder="למשל: שלום? בית"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-describedby="rack-hint"
        />
        {value.length > 0 && (
          <button
            type="button"
            className="search__clear"
            onClick={onClear}
            aria-label="נקה את שדה האותיות"
            disabled={disabled}
          >
            ×
          </button>
        )}
      </div>
      <p id="rack-hint" className="search__hint">
        רווחים מתעלמים. השתמשו ב־<kbd>?</kbd> כג׳וקר לאות אחת כלשהי.
      </p>
    </section>
  );
}
