// Placeholder scoring — one point per Hebrew letter. Matches scoring.py.

const HEBREW_LETTER_START = 0x05d0;
const HEBREW_LETTER_END = 0x05ea;

/** Count Hebrew letters (U+05D0–U+05EA) in *word*. Niqqud and other chars are ignored. */
export function scoreWord(word: string): number {
  let n = 0;
  for (const ch of word) {
    const cp = ch.codePointAt(0)!;
    if (cp >= HEBREW_LETTER_START && cp <= HEBREW_LETTER_END) n += 1;
  }
  return n;
}
