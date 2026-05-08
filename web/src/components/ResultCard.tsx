interface ResultCardProps {
  word: string;
  score: number;
}

export function ResultCard({ word, score }: ResultCardProps) {
  return (
    <li className="result-card">
      <span className="result-card__word">{word}</span>
      <span className="result-card__meta" aria-label={`${score} אותיות עבריות`}>
        {score}
      </span>
    </li>
  );
}
