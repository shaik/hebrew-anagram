import {
  FIXED_WORD_CLEAR_ARIA,
  FIXED_WORD_HINT,
  FIXED_WORD_LABEL,
  FIXED_WORD_OPTIONAL,
  FIXED_WORD_PLACEHOLDER,
} from "../strings";

interface FixedWordFieldProps {
  value: string;
  onChange: (next: string) => void;
  /** Show a Hebrew error below the field when validation fails. */
  errorMessage?: string;
  disabled?: boolean;
}

export function FixedWordField({
  value,
  onChange,
  errorMessage,
  disabled,
}: FixedWordFieldProps) {
  const hasError = errorMessage !== undefined && value.trim() !== "";
  return (
    <section className="fixed-word">
      <label htmlFor="fixed-word" className="fixed-word__label">
        {FIXED_WORD_LABEL}{" "}
        <span className="fixed-word__optional">{FIXED_WORD_OPTIONAL}</span>
      </label>
      <div className="fixed-word__input-wrap">
        <input
          id="fixed-word"
          className={`fixed-word__input${hasError ? " fixed-word__input--invalid" : ""}`}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          dir="rtl"
          lang="he"
          placeholder={FIXED_WORD_PLACEHOLDER}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby="fixed-word-hint"
        />
        {value.length > 0 && (
          <button
            type="button"
            className="fixed-word__clear"
            onClick={() => onChange("")}
            aria-label={FIXED_WORD_CLEAR_ARIA}
            disabled={disabled}
          >
            ×
          </button>
        )}
      </div>
      <p
        id="fixed-word-hint"
        className={`fixed-word__hint${hasError ? " fixed-word__hint--error" : ""}`}
        role={hasError ? "alert" : undefined}
      >
        {hasError ? errorMessage : FIXED_WORD_HINT}
      </p>
    </section>
  );
}
