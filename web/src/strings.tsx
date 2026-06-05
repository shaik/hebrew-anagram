// ============================================================================
// Centralized UI copy for the Hebrew anagram web app.
//
// Edit Hebrew (or any other display) text here without touching component
// logic. Components import these by name and never hard-code Hebrew in
// their own files.
// ============================================================================

import type { ReactNode } from "react";

export const APP_TITLE = "אנגרמות";
export const APP_TAGLINE = "אנגרמות, כי גימטריה זה לחלשים";
export const APP_FOOTER: ReactNode = (
  <>
    עוד מוצר מטריפ מבית היוצר של{" "}
    <a href="https://shaikfir.com" target="_blank" rel="noopener">
      שי כפיר
    </a>{" "}
    ועוזריהם
  </>
);

// Bump by 0.01 on every code change. Rendered in the footer.
export const APP_VERSION = "1.21";

// ----- Input rack -----------------------------------------------------------

export const INPUT_ARIA = "אותיות לחיפוש";
export const INPUT_PLACEHOLDER = "הקלידו אותיות…";
export const CLEAR_ARIA = "נקה את האותיות";

// ----- Next / previous buttons ------------------------------------------------

export const NEXT_BUTTON_LABEL = "הצירוף הבא";
export const PREV_BUTTON_ARIA = "הצירוף הקודם";

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

// ----- Share button -----------------------------------------------------------

export const SHARE_LABEL = "שתפו";
export const SHARE_ARIA = "שתפו קישור לאותיות ולצירוף";
export const SHARE_COPIED = "הועתק!";
export const SHARE_TITLE = "מחולל האנגרמות הפאן-גלקטי";

/** The shared message: bold title (WhatsApp `*…*` markup) + the typed letters. */
export function shareText(letters: string): string {
  return `*${SHARE_TITLE}*\nאנגרמות ל״${letters}״`;
}

// ----- Word reorder hint --------------------------------------------------------

export const REORDER_HINT = "שנה את סדר המלים בגרירה";

// ----- Fixed word ----------------------------------------------------------------

export const FIXED_TOGGLE_LABEL = "+ מילה קבועה";
export const FIXED_INPUT_ARIA = "מילה קבועה";
export const FIXED_PLACEHOLDER = "מילה שתופיע בכל צירוף";
export const FIXED_CLEAR_ARIA = "הסר את המילה הקבועה";
/** Screen-reader description for the invalid (red-ring) fixed-word state. */
export const FIXED_INVALID_ARIA = "המילה הקבועה אינה מורכבת מהאותיות שהוזנו";
