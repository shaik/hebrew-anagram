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
