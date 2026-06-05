// ============================================================================
// Centralized UI copy for the Hebrew anagram web app.
//
// Edit Hebrew (or any other display) text here without touching component
// logic. Components import these by name and never hard-code Hebrew in
// their own files.
// ============================================================================

export const APP_TITLE = "אנגרמות";
export const APP_TAGLINE = "מערבבים את האותיות, מגלים צירוף חדש";
export const APP_FOOTER =
  "עוד מוצר מטריפ מבית היוצר של שי כפיר ועוזריהם. ללא חשש טבל ושביעית";

// Bump by 0.01 on every code change. Rendered in the footer.
export const APP_VERSION = "1.11";

// ----- Input rack -----------------------------------------------------------

export const INPUT_ARIA = "אותיות לחיפוש";
export const INPUT_PLACEHOLDER = "הקלידו אותיות…";
export const CLEAR_ARIA = "נקה את האותיות";

// ----- Next-match button ----------------------------------------------------

export const NEXT_BUTTON_LABEL = "הצירוף הבא";

// ----- Status line ----------------------------------------------------------

export const STATUS_LOADING = "טוען מילון…";
export const STATUS_DICT_ERROR =
  "טעינת המילון נכשלה. ודאו שהקובץ hebrew_dict.txt זמין ונסו לרענן.";
export const STATUS_NO_MATCHES = "לא נמצאו צירופים מהאותיות האלה";

export function statusTooLong(maxLetters: number): string {
  return `עד ${maxLetters.toLocaleString("he-IL")} אותיות לחיפוש`;
}

/** "צירוף 3 מתוך 41" */
export function statusCounter(current: number, total: number): string {
  return `צירוף ${current.toLocaleString("he-IL")} מתוך ${total.toLocaleString("he-IL")}`;
}
