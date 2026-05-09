// ============================================================================
// Centralized UI copy for the Hebrew anagram web app.
//
// Edit Hebrew (or any other display) text here without touching component
// logic. Three flavors of export:
//
//   1. Plain `const` strings   — fixed copy with no interpolation.
//   2. Functions               — strings that need values injected at runtime,
//                                e.g. counts or limits. They return a
//                                formatted string or a `ReactNode`.
//   3. ReactNode constants     — copy with embedded inline markup like
//                                <kbd>?</kbd> or <strong>…</strong>.
//
// If you only want to change wording, edit the right-hand side of each
// export below. Components import these by name and never hard-code Hebrew
// in their own files.
// ============================================================================

import type { ReactNode } from "react";
import type { SearchMode } from "./components/OptionsPanel";

// ----- App shell -----------------------------------------------------------

export const APP_TITLE = "אנגרמות בעברית";
export const APP_TAGLINE = "פותר אנגרמות, מסייע בתשבצים, מרחיק רוחות רעות ושדים מארונות המטבח";
export const APP_FOOTER =
  "עוד מוצר מטריפ מבית היוצר של שי כפיר ועוזריהם. ללא חשש טבל ושביעית";

// Bump by 0.01 on every code change. Rendered in the footer.
export const APP_VERSION = "1.08";

// ----- Mode toggle ---------------------------------------------------------

export const MODE_LABELS: Record<SearchMode, string> = {
  single: "מילים בודדות",
  multi: "אנגרמות מרובות מילים",
  crossword: "תבנית תשבץ",
};

// ----- Search form (rack / pattern input) ----------------------------------

export interface SearchFormCopy {
  label: string;
  placeholder: string;
  hint: ReactNode;
}

export const SEARCH_FORM_COPY: Record<SearchMode, SearchFormCopy> = {
  single: {
    label: "הקלידו מילה או אותיות",
    placeholder: "יאללה הפועל",
    hint: (
      <>
        השתמשו ב־<kbd>?</kbd> כג׳וקר לאות כלשהי.
      </>
    ),
  },
  multi: {
    label: "הקלידו מילה או אותיות",
    placeholder: "הפועל אימפריה",
    hint: <>המערכת מתעלמת מרווחים וסימני פיסוק</>,
  },
  crossword: {
    label: "תבנית",
    placeholder: "למשל: ??גד? או ?ר??ב??יד",
    hint: <>ניתן להשתמש בכל סימן שאינו אות כמקום לאות</>,
  },
};

export const SEARCH_FORM_CLEAR_ARIA = "נקה את האותיות";

// ----- Mode explainer banners ---------------------------------------------

export function multiModeExplainer(maxResults: number): ReactNode {
  return (
    <>
      צירופים שמשתמשים בכל האותיות שלך <strong>בדיוק</strong>. עד {maxResults.toLocaleString("he-IL")} תוצאות.
    </>
  );
}

export const CROSSWORD_MODE_EXPLAINER: ReactNode = (
  <>
    <strong>תבנית תשבץ:</strong> אותיות עבריות הן מיקומים קבועים, וכל תו אחר
    (ספרה, סימן פיסוק וכו׳) הוא תו חופשי. אורך המילה חייב להיות זהה לאורך
    התבנית.
  </>
);

// ----- Fixed-word field (multi mode only) ---------------------------------

export const FIXED_WORD_LABEL = "מילה קבועה";
export const FIXED_WORD_OPTIONAL = "(לא חובה)";
export const FIXED_WORD_PLACEHOLDER = "למשל: קר";
export const FIXED_WORD_HINT = "יוצגו רק אנגרמות שמכילות את המילה הזו.";
export const FIXED_WORD_INVALID =
  "המילה הקבועה אינה מורכבת מהאותיות שהוזנו";
export const FIXED_WORD_CLEAR_ARIA = "נקה את המילה הקבועה";

// ----- Options panel -------------------------------------------------------

export const OPTIONS_ARIA = "אפשרויות חיפוש";
export const MODE_GROUP_ARIA = "מצב חיפוש";
export const MIN_LENGTH_LABEL = "אורך מינימלי";
export function minLengthOption(n: number): string {
  return `${n} אותיות ומעלה`;
}
export const SORT_LABEL = "מיון";
export const SORT_LONGEST = "ארוכות תחילה";
export const SORT_SHORTEST = "קצרות תחילה";
export const SORT_DICT = "סדר המילון";
export const NORMALIZE_FINALS_LABEL = "התעלם מצורות סופיות (ך/כ, ם/מ ...)";

// ----- Results headers -----------------------------------------------------

export interface PluralPair {
  singular: string;
  plural: string;
}

/** "1 מילה תואמת" vs "5 מילים תואמות" */
export const SINGLE_RESULTS_LABEL: PluralPair = {
  singular: "מילה תואמת",
  plural: "מילים תואמות",
};

/** "1 צירוף" vs "5 צירופים" */
export const MULTI_RESULTS_LABEL: PluralPair = {
  singular: "צירוף",
  plural: "צירופים",
};

/** Crossword header. */
export const PATTERN_RESULTS_LABEL: PluralPair = {
  singular: "מילה תואמת לתבנית",
  plural: "מילים תואמות לתבנית",
};

export function pluralize(n: number, pair: PluralPair): string {
  return n === 1 ? pair.singular : pair.plural;
}

export function shownNote(shown: number): string {
  return `(מוצגות ${shown.toLocaleString("he-IL")} ראשונות)`;
}
export function cappedNote(cap: number): string {
  return `(הוגבל ל־${cap.toLocaleString("he-IL")})`;
}

// ----- Result lists / cards -----------------------------------------------

export const RESULTS_LIST_ARIA = "תוצאות החיפוש";
export const MULTI_RESULTS_LIST_ARIA = "צירופי אנגרמות מרובות מילים";

/** ARIA label for the small badge showing how many words a combo has. */
export function wordCountAriaLabel(n: number): string {
  return `${n} מילים`;
}

/** ARIA label for the small badge showing a word's letter score. */
export function scoreAriaLabel(n: number): string {
  return `${n} אותיות עבריות`;
}

// ----- Empty / loading / error states -------------------------------------

export interface EmptyCopy {
  title: string;
  body: string;
}

export const EMPTY_STATE_COPY: Record<
  "loading" | "error" | "idle" | "no-results",
  EmptyCopy
> = {
  loading: {
    title: "טוען מילון…",
    body: "מוריד את רשימת המילים אל הדפדפן.",
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

// ----- Special multi-mode notices -----------------------------------------

export const MULTI_WILDCARD_DISABLED_MSG =
  "אנגרמות מרובות מילים אינן תומכות בג'וקר (?). הסירו את הסימן, או חזרו למצב מילים בודדות.";

export function multiInputTooLongMsg(maxLetters: number): string {
  return `קלט ארוך מדי לחיפוש מהיר. נסו עד ${maxLetters} אותיות (לאחר התעלמות מרווחים), או עברו למצב מילים בודדות.`;
}
