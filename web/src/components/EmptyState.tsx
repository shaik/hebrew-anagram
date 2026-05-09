import { EMPTY_STATE_COPY } from "../strings";

interface EmptyStateProps {
  variant: "loading" | "error" | "idle" | "no-results";
  message?: string;
}

export function EmptyState({ variant, message }: EmptyStateProps) {
  const copy = EMPTY_STATE_COPY[variant];
  return (
    <div className={`empty empty--${variant}`} role="status">
      <h2 className="empty__title">{copy.title}</h2>
      <p className="empty__body">{message ?? copy.body}</p>
    </div>
  );
}
