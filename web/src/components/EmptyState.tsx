interface EmptyStateProps {
  variant: "loading" | "error" | "idle" | "no-results";
  message?: string;
}

const COPY: Record<EmptyStateProps["variant"], { title: string; body: string }> = {
  loading: {
    title: "טוען מילון…",
    body: "מוריד את רשימת המילים אל הדפדפן. החישוב כולו נעשה אצלך, ללא שרת.",
  },
  error: {
    title: "טעינת המילון נכשלה",
    body: "ודאו שיש חיבור מקומי לשרת הפיתוח, ושהקובץ hebrew_dict.txt קיים תחת public/.",
  },
  idle: {
    title: "הקלידו אותיות כדי להתחיל",
    body: "התוצאות יופיעו אוטומטית. אפשר להוסיף ? ככלי כדי לסמן אות חסרה.",
  },
  "no-results": {
    title: "לא נמצאו מילים",
    body: "נסו להוסיף אותיות, להקליד ?, או להפחית את האורך המינימלי.",
  },
};

export function EmptyState({ variant, message }: EmptyStateProps) {
  const copy = COPY[variant];
  return (
    <div className={`empty empty--${variant}`} role="status">
      <h2 className="empty__title">{copy.title}</h2>
      <p className="empty__body">{message ?? copy.body}</p>
    </div>
  );
}
