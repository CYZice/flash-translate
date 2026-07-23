import { describe, expect, it, vi } from "vitest";
import type { HoveredTerm } from "./hovered-term";
import { TermTranslationCache } from "./term-translation-cache";
import {
  executeTermTranslation,
  type TermTranslator,
} from "./term-translation-executor";

const HOVERED_TERM: HoveredTerm = {
  sourceText: "translate",
  contextText: "Please translate this sentence.",
  anchorRect: {
    top: 10,
    right: 30,
    bottom: 20,
    left: 10,
    width: 20,
    height: 10,
  },
};

describe("executeTermTranslation", () => {
  it("returns a DOM-independent result and caches the translation", async () => {
    const translate = vi.fn().mockResolvedValue("翻訳する");
    const translator: TermTranslator = { translate };
    const cache = new TermTranslationCache();
    const options = {
      hoveredTerm: HOVERED_TERM,
      sourceLanguage: "en",
      targetLanguage: "ja",
      signal: new AbortController().signal,
      cache,
      translator,
    };

    await expect(executeTermTranslation(options)).resolves.toEqual({
      sourceText: "translate",
      translatedText: "翻訳する",
      contextText: "Please translate this sentence.",
      sourceLanguage: "en",
      targetLanguage: "ja",
    });
    await executeTermTranslation(options);

    expect(translate).toHaveBeenCalledTimes(1);
  });
});
