import { describe, expect, it } from "vitest";
import { TermTranslationCache } from "./term-translation-cache";

const EN_TO_JA = {
  sourceText: "translate",
  sourceLanguage: "en",
  targetLanguage: "ja",
};

describe("TermTranslationCache", () => {
  it("returns a completed translation for the same language pair and term", () => {
    const cache = new TermTranslationCache();
    cache.set(EN_TO_JA, "翻訳する");

    expect(cache.get(EN_TO_JA)).toBe("翻訳する");
  });

  it("keeps translations for different language pairs separate", () => {
    const cache = new TermTranslationCache();
    cache.set(EN_TO_JA, "翻訳する");

    expect(
      cache.get({
        ...EN_TO_JA,
        targetLanguage: "fr",
      })
    ).toBeNull();
  });

  it("evicts the least recently used translation at the configured limit", () => {
    const cache = new TermTranslationCache(2);
    const first = { ...EN_TO_JA, sourceText: "first" };
    const second = { ...EN_TO_JA, sourceText: "second" };
    const third = { ...EN_TO_JA, sourceText: "third" };
    cache.set(first, "一");
    cache.set(second, "二");
    cache.get(first);

    cache.set(third, "三");

    expect(cache.get(first)).toBe("一");
    expect(cache.get(second)).toBeNull();
    expect(cache.get(third)).toBe("三");
  });
});
