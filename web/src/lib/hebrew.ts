// Hebrew text normalization utilities. Mirrors src/hebrew_anagram/letters.py
// in the Python reference implementation. Keep behavior in sync.

const NIQQUD_START = 0x0591;
const NIQQUD_END = 0x05c7;

const FINAL_TO_BASE: Readonly<Record<string, string>> = {
  "ך": "כ", // U+05DA -> U+05DB
  "ם": "מ", // U+05DD -> U+05DE
  "ן": "נ", // U+05DF -> U+05E0
  "ף": "פ", // U+05E3 -> U+05E4
  "ץ": "צ", // U+05E5 -> U+05E6
};

// Reverse: base form -> final form, used for display restoration only.
const BASE_TO_FINAL: Readonly<Record<string, string>> = {
  "כ": "ך",
  "מ": "ם",
  "נ": "ן",
  "פ": "ף",
  "צ": "ץ",
};

/** Strip Hebrew niqqud (U+0591–U+05C7). Other characters pass through. */
export function removeNiqqud(text: string): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp >= NIQQUD_START && cp <= NIQQUD_END) continue;
    out += ch;
  }
  return out;
}

/** Map ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ. Other characters pass through. */
export function normalizeFinalLetters(text: string): string {
  let out = "";
  for (const ch of text) {
    out += FINAL_TO_BASE[ch] ?? ch;
  }
  return out;
}

export interface NormalizeOptions {
  removeNiqqudEnabled?: boolean;
  normalizeFinals?: boolean;
}

/** Niqqud strip (default on) + optional final-letter normalization + whitespace collapse. */
export function normalizeText(
  text: string,
  { removeNiqqudEnabled = true, normalizeFinals = false }: NormalizeOptions = {},
): string {
  let out = text;
  if (removeNiqqudEnabled) out = removeNiqqud(out);
  if (normalizeFinals) out = normalizeFinalLetters(out);
  return out.replace(/\s+/g, " ").trim();
}

const HEBREW_BLOCK_START = 0x0590;
const HEBREW_BLOCK_END = 0x05ff;

/** True iff every character is in the Hebrew block U+0590–U+05FF. */
export function isHebrewOnly(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp < HEBREW_BLOCK_START || cp > HEBREW_BLOCK_END) return false;
  }
  return true;
}

// Word-boundary detection for `restoreFinalLettersForDisplay` uses the
// Hebrew *letter* range (alef U+05D0 .. tav U+05EA) rather than the whole
// Hebrew block — so niqqud (U+0591–U+05C7) and punctuation like Maqaf
// (U+05BE) correctly count as word boundaries.
const HEBREW_LETTER_START = 0x05d0;
const HEBREW_LETTER_END = 0x05ea;

function isHebrewLetter(ch: string | undefined): boolean {
  if (ch === undefined) return false;
  const cp = ch.codePointAt(0)!;
  return cp >= HEBREW_LETTER_START && cp <= HEBREW_LETTER_END;
}

/**
 * Strip every character that is not a Hebrew letter (U+05D0–U+05EA),
 * optionally preserving any character listed in `alsoKeep`. Use this to
 * sanitize raw user input before searching: spaces, commas, dashes, ASCII,
 * digits, niqqud, and Hebrew punctuation (Maqaf, Geresh, …) are all dropped.
 *
 * Examples:
 *   keepHebrewLetters("שלום, בית")       // "שלוםבית"
 *   keepHebrewLetters("של?ום", "?")      // "של?ום"  (preserves the wildcard)
 *   keepHebrewLetters("שָׁלוֹם!")           // "שלום"   (niqqud + punctuation gone)
 */
export function keepHebrewLetters(text: string, alsoKeep = ""): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (
      (cp >= HEBREW_LETTER_START && cp <= HEBREW_LETTER_END) ||
      alsoKeep.includes(ch)
    ) {
      out += ch;
    }
  }
  return out;
}

/**
 * Restore final-form Hebrew letters at end-of-word positions for display.
 *
 * Internal matching may collapse final letters (ם→מ etc.) to make the bundled
 * dictionary searchable. This helper undoes that mapping for display only:
 * a base-form letter (כ ,מ ,נ ,פ ,צ) is rewritten as its final form when the
 * next character is not a Hebrew letter (whitespace, punctuation including
 * Maqaf, niqqud, end of string). Letters in the interior of a word are left
 * alone, and final-form letters that are already correct pass through
 * unchanged. Works on single words and on multi-word strings.
 */
export function restoreFinalLettersForDisplay(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const final = BASE_TO_FINAL[ch];
    if (final !== undefined && !isHebrewLetter(text[i + 1])) {
      out += final;
    } else {
      out += ch;
    }
  }
  return out;
}
