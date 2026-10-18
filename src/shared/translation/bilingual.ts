const CHINESE_TEXT = /\p{Script=Han}/u;

/** A bounded Chinese/English mode: Chinese (including mixed text) → EN, otherwise → ZH. */
export function getEnglishChinesePair(text: string): {
  sourceLanguage: "en" | "zh";
  targetLanguage: "en" | "zh";
} {
  return CHINESE_TEXT.test(text)
    ? { sourceLanguage: "zh", targetLanguage: "en" }
    : { sourceLanguage: "en", targetLanguage: "zh" };
}
