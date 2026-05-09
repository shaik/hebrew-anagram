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
        מילה קבועה <span className="fixed-word__optional">(לא חובה)</span>
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
          placeholder="למשל: קר"
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
            aria-label="נקה את המילה הקבועה"
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
        {hasError ? errorMessage : "יוצגו רק אנגרמות שמכילות את המילה הזו."}
      </p>
    </section>
  );
}
