import type { ReactNode } from "react";
import { SEARCH_FORM_CLEAR_ARIA, SEARCH_FORM_COPY } from "../strings";

interface SearchFormProps {
  value: string;
  onChange: (next: string) => void;
  onClear: () => void;
  disabled?: boolean;
  /** Field label. Defaults to single-word mode copy from strings.tsx. */
  label?: string;
  /** Input placeholder. Defaults to single-word mode copy from strings.tsx. */
  placeholder?: string;
  /** Helper text under the input. May be a string or React fragment. */
  hint?: ReactNode;
  /** ARIA label for the clear button (default from strings.tsx). */
  clearAriaLabel?: string;
}

export function SearchForm({
  value,
  onChange,
  onClear,
  disabled,
  label = SEARCH_FORM_COPY.single.label,
  placeholder = SEARCH_FORM_COPY.single.placeholder,
  hint = SEARCH_FORM_COPY.single.hint,
  clearAriaLabel = SEARCH_FORM_CLEAR_ARIA,
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
