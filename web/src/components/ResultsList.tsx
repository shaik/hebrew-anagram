import { ResultCard } from "./ResultCard";
import { RESULTS_LIST_ARIA } from "../strings";

interface Result {
  word: string;
  score: number;
}

interface ResultsListProps {
  results: readonly Result[];
}

export function ResultsList({ results }: ResultsListProps) {
  return (
    <ul className="results-list" aria-label={RESULTS_LIST_ARIA}>
      {results.map((r) => (
        <ResultCard key={r.word} word={r.word} score={r.score} />
      ))}
    </ul>
  );
}
