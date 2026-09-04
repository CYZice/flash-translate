import { normalizeLanguageCode } from "@/shared/storage/settings";

type Script = "latin" | "cjk" | "kana" | "hangul" | "cyrillic" | "other";

const LETTER_PATTERN = /\p{Letter}/u;
const LATIN_PATTERN = /\p{Script=Latin}/u;
const HAN_PATTERN = /\p{Script=Han}/u;
const KANA_PATTERN = /\p{Script=Hiragana}|\p{Script=Katakana}/u;
const HANGUL_PATTERN = /\p{Script=Hangul}/u;
const CYRILLIC_PATTERN = /\p{Script=Cyrillic}/u;

function getScript(character: string): Script | null {
  if (!LETTER_PATTERN.test(character)) {
    return null;
  }
  if (LATIN_PATTERN.test(character)) {
    return "latin";
  }
  if (HAN_PATTERN.test(character)) {
    return "cjk";
  }
  if (KANA_PATTERN.test(character)) {
    return "kana";
  }
  if (HANGUL_PATTERN.test(character)) {
    return "hangul";
  }
  if (CYRILLIC_PATTERN.test(character)) {
    return "cyrillic";
  }
  return "other";
}

function scriptsForLanguage(language: string): Set<Script> {
  switch (normalizeLanguageCode(language)) {
    case "zh":
      return new Set(["cjk"]);
    case "ja":
      return new Set(["cjk", "kana"]);
    case "ko":
      return new Set(["hangul"]);
    case "ru":
    case "uk":
      return new Set(["cyrillic"]);
    default:
      return new Set(["latin"]);
  }
}

export function hasMixedLanguageSelection(
  text: string,
  targetLanguage: string
): boolean {
  const allowed = scriptsForLanguage(targetLanguage);
  for (const character of text) {
    const script = getScript(character);
    if (script && !allowed.has(script)) {
      return true;
    }
  }
  return false;
}
