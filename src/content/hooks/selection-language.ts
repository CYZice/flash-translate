import { normalizeLanguageCode } from "@/shared/storage/settings";

type Script = "latin" | "cjk" | "kana" | "hangul" | "cyrillic" | "other";

function getScript(character: string): Script | null {
  if (!/\p{Letter}/u.test(character)) return null;
  if (/\p{Script=Latin}/u.test(character)) return "latin";
  if (/\p{Script=Han}/u.test(character)) return "cjk";
  if (/\p{Script=Hiragana}|\p{Script=Katakana}/u.test(character)) return "kana";
  if (/\p{Script=Hangul}/u.test(character)) return "hangul";
  if (/\p{Script=Cyrillic}/u.test(character)) return "cyrillic";
  return "other";
}

function scriptsForLanguage(language: string): Set<Script> {
  switch (normalizeLanguageCode(language)) {
    case "zh": return new Set(["cjk"]);
    case "ja": return new Set(["cjk", "kana"]);
    case "ko": return new Set(["hangul"]);
    case "ru":
    case "uk": return new Set(["cyrillic"]);
    default: return new Set(["latin"]);
  }
}

export function hasMixedLanguageSelection(text: string, targetLanguage: string): boolean {
  const allowed = scriptsForLanguage(targetLanguage);
  for (const character of text) {
    const script = getScript(character);
    if (script && !allowed.has(script)) return true;
  }
  return false;
}
