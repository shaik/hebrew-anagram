import type { ReactNode } from "react";

interface SearchFormProps {
  value: string;
  onChange: (next: string) => void;
  onClear: () => void;
  disabled?: boolean;
  /** Field label (default: "האותיות שלך"). */
  label?: string;
  /** Input placeholder (default: anagram example). */
  placeholder?: string;
  /** Helper text under the input. May be a string or React fragment. */
  hint?: ReactNode;
  /** ARIA label for the clear button (default: "נקה את שדה האותיות"). */
  clearAriaLabel?: string;
}

const DEFAULT_HINT = (
  <>
    רווחים מתעלמים. השתמשו ב־<kbd>?</kbd> כג׳וקר לאות אחת כלשהי.
  </>
);

export function SearchForm({
  value,
  onChange,
  onClear,
  disabled,
  label = "האותיות שלך",
  placeholder = "למשל: שלום? בית",
  hint = DEFAULT_HINT,
  clearAriaLabel = "נקה את שדה האותיות",
}: SearchFormProps) {
  return (
    <section className="search">
      <label htmlFor="rack" className="search__label">
        {label}
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
          placeholder={placeholder}
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
            aria-label={clearAriaLabel}
            disabled={disabled}
          >
            ×
          </button>
        )}
      </div>
      <p id="rack-hint" className="search__hint">
        {hint}
      </p>
    </section>
  );
}
