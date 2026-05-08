import { restoreFinalLettersForDisplay } from "../lib/hebrew";
import type { MultiWordResult } from "../lib/multiwordAnagrams";

interface MultiResultsListProps {
  combos: readonly MultiWordResult[];
}

export function MultiResultsList({ combos }: MultiResultsListProps) {
  return (
    <ul className="multi-results-list" aria-label="צירופי אנגרמות מרובות מילים">
      {combos.map((c, idx) => {
        const display = c.words.map(restoreFinalLettersForDisplay);
        const phrase = display.join(" ");
        const wordCount = display.length;
        // Index-based key: defensively unique even if the source list ever
        // contains visually-identical phrases (the algorithm + deduped dict
        // guarantee uniqueness today, but keys shouldn't depend on that).
        return (
          <li key={idx} className="multi-result-card">
            <span className="multi-result-card__phrase" lang="he" dir="rtl">
              {phrase}
            </span>
            <span
              className="multi-result-card__meta"
              aria-label={`${wordCount} מילים`}
            >
              {wordCount}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
