import { describe, expect, it } from "vitest";
import { resolveTranslationLanguages } from "./translation-languages";

describe("selection translation languages", () => {
  const settings = {
    sourceLanguage: "fr",
    targetLanguage: "ja",
    autoZhEn: false,
  };
  it("retains fixed and detected languages outside bilingual mode", () => {
    expect(resolveTranslationLanguages(settings, "Hello", "en", false)).toEqual(
      { sourceLanguage: "fr", targetLanguage: "ja" }
    );
    expect(resolveTranslationLanguages(settings, "Hello", "en", true)).toEqual({
      sourceLanguage: "en",
      targetLanguage: "ja",
    });
  });
  it("automatically chooses both languages instead of the fixed defaults or stale detection", () => {
    expect(
      resolveTranslationLanguages(
        { ...settings, autoZhEn: true },
        "Hello",
        "zh",
        true
      )
    ).toEqual({ sourceLanguage: "en", targetLanguage: "zh" });
    expect(
      resolveTranslationLanguages(
        { ...settings, autoZhEn: true },
        "你好",
        "en",
        false
      )
    ).toEqual({ sourceLanguage: "zh", targetLanguage: "en" });
  });
});
