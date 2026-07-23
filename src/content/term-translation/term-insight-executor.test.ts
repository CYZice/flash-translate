import { describe, expect, it, vi } from "vitest";
import type { HoveredTerm, TermTranslationResult } from "./hovered-term";
import { TermInsightCache } from "./term-insight-cache";
import {
  executeTermInsight,
  type TermInsightProvider,
} from "./term-insight-executor";

const HOVERED_TERM: HoveredTerm = {
  sourceText: "fairly",
  contextText:
    "The introduction is unrelated. They are fairly large for a resource. The ending is unrelated.",
  termOffset: 44,
  anchorRect: {
    top: 10,
    right: 50,
    bottom: 28,
    left: 10,
    width: 40,
    height: 18,
  },
};

const TRANSLATION: TermTranslationResult = {
  sourceText: "fairly",
  translatedText: "かなり",
  contextText: HOVERED_TERM.contextText,
  sourceLanguage: "en",
  targetLanguage: "ja",
};

const INSIGHT = {
  expression: "fairly",
  contextualMeaning: "かなり",
  coreMeaning: "程度を穏やかに示す",
  roleInContext: "large の程度を説明する",
  partOfSpeech: "副詞",
  isMultiwordExpression: false,
};

describe("executeTermInsight", () => {
  it("passes only a bounded plain-text context to the provider", async () => {
    const analyze = vi
      .fn<TermInsightProvider["analyze"]>()
      .mockResolvedValue(INSIGHT);

    const result = await executeTermInsight({
      hoveredTerm: HOVERED_TERM,
      translation: TRANSLATION,
      signal: new AbortController().signal,
      cache: new TermInsightCache(),
      provider: { analyze },
      onProgress: vi.fn(),
    });

    expect(analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceText: "fairly",
        quickTranslation: "かなり",
        context: {
          text: HOVERED_TERM.contextText,
          termOffset: HOVERED_TERM.termOffset,
          strategy: "neighboring-sentences",
        },
      }),
      expect.any(AbortSignal),
      expect.any(Function)
    );
    expect(result.insight).toEqual(INSIGHT);
  });

  it("reuses a contextual insight from the cache", async () => {
    const analyze = vi
      .fn<TermInsightProvider["analyze"]>()
      .mockResolvedValue(INSIGHT);
    const options = {
      hoveredTerm: HOVERED_TERM,
      translation: TRANSLATION,
      signal: new AbortController().signal,
      cache: new TermInsightCache(),
      provider: { analyze },
      onProgress: vi.fn(),
    };

    await executeTermInsight(options);
    await executeTermInsight(options);

    expect(analyze).toHaveBeenCalledTimes(1);
  });
});
