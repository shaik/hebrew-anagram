import { ResultCard } from "./ResultCard";

interface Result {
  word: string;
  score: number;
}

interface ResultsListProps {
  results: readonly Result[];
}

export function ResultsList({ results }: ResultsListProps) {
  return (
    <ul className="results-list" aria-label="תוצאות החיפוש">
      {results.map((r) => (
        <ResultCard key={r.word} word={r.word} score={r.score} />
      ))}
    </ul>
  );
}
