import fs from "fs";
import path from "path";

// Which font draws which text on a certificate PDF.
//
// PDFKit's built-in fonts only cover Latin letters (with accents). Names in
// Urdu (Arabic script) or Hindi (Devanagari) need a font file that has those
// letters; PDFKit then joins Arabic letters and reorders right-to-left text by
// itself (through fontkit). The fonts are free (SIL Open Font License) but not
// bundled; drop them into server/fonts/ (see README) to switch this on:
//
//   NotoNaskhArabic-Regular.ttf, NotoNaskhArabic-Bold.ttf      Urdu, Arabic, Persian
//   NotoSansDevanagari-Regular.ttf, NotoSansDevanagari-Bold.ttf Hindi, Marathi, Nepali
//
// Without them, such certificates keep using the browser's Print / Save as PDF.
// A text mixing scripts (e.g. "Ali علی") can't be drawn with one font and also
// falls back - the certificate page prints it fine.

export type Script = "latin" | "arabic" | "devanagari";
export type Weight = "regular" | "bold";

// Allowed alongside any script: spaces, digits and common punctuation.
const NEUTRAL = /[\x20-\x40\x5B-\x60\x7B-\x7E\xA0-\xBF -⁯]/;
const LATIN = /[A-Za-z\xC0-\xFF]/;
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const DEVANAGARI = /[ऀ-ॿ꣠-ꣿ᳐-᳿]/;
const LATIN_ONLY = /^[\x20-\x7E\xA0-\xFF]*$/;

// The one script a text is written in, or null when it can't be drawn with a
// single font (mixed scripts, a script with no font, control characters).
export const scriptOf = (text: string): Script | null => {
  if (LATIN_ONLY.test(text)) return "latin";
  let found: Script | null = null;
  for (const ch of text) {
    const s: Script | "neutral" | null = NEUTRAL.test(ch)
      ? "neutral"
      : ARABIC.test(ch) || /[‌‍]/.test(ch) // zero-width (non-)joiners are used in Urdu and Hindi
        ? "arabic"
        : DEVANAGARI.test(ch)
          ? "devanagari"
          : LATIN.test(ch)
            ? "latin"
            : null;
    if (s === null) return null;
    if (s === "neutral") continue;
    // the zero-width joiners count for whichever script is already there
    if (/[‌‍]/.test(ch) && found) continue;
    if (found && found !== s) return null;
    found = s;
  }
  return found || "latin";
};

export const FONT_FILES: Record<Exclude<Script, "latin">, Record<Weight, string>> = {
  arabic: { regular: "NotoNaskhArabic-Regular.ttf", bold: "NotoNaskhArabic-Bold.ttf" },
  devanagari: { regular: "NotoSansDevanagari-Regular.ttf", bold: "NotoSansDevanagari-Bold.ttf" },
};

// server/fonts by default (CERTIFICATE_FONTS_DIR to put them elsewhere).
// The compiled server (CommonJS) knows its own folder; where __dirname doesn't
// exist (ES modules, some test runners) the server folder is the working
// directory, as with every npm script.
export const fontsDir = (env: NodeJS.ProcessEnv = process.env) =>
  env.CERTIFICATE_FONTS_DIR ||
  (typeof __dirname !== "undefined" ? path.resolve(__dirname, "../../fonts") : path.resolve("fonts"));

// The font files that are actually there. A missing bold falls back to the
// regular file of the same script; a script with no regular file has no font.
export const availableFonts = (
  dir = fontsDir(),
  exists: (p: string) => boolean = fs.existsSync
): Partial<Record<Exclude<Script, "latin">, Record<Weight, string>>> => {
  const out: Partial<Record<Exclude<Script, "latin">, Record<Weight, string>>> = {};
  for (const script of Object.keys(FONT_FILES) as Exclude<Script, "latin">[]) {
    const regular = path.join(dir, FONT_FILES[script].regular);
    if (!exists(regular)) continue;
    const bold = path.join(dir, FONT_FILES[script].bold);
    out[script] = { regular, bold: exists(bold) ? bold : regular };
  }
  return out;
};

// Can every text be drawn with the fonts we have?
export const canDrawAll = (texts: string[], fonts = availableFonts()): boolean =>
  texts.every((t) => {
    const s = scriptOf(t);
    return s === "latin" || (s !== null && !!fonts[s]);
  });
