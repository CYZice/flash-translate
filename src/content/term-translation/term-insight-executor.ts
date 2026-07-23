import type { HoveredTerm, TermTranslationResult } from "./hovered-term";
import { resolveTermContext, type TermContext } from "./term-context";
import type { TermInsight, TermInsightResult } from "./term-insight";
import type { TermInsightCache } from "./term-insight-cache";

export interface TermInsightProvider {
  analyze: (
    input: {
      sourceText: string;
      quickTranslation: string;
      sourceLanguage: string;
      targetLanguage: string;
      context: TermContext;
    },
    signal: AbortSignal
  ) => Promise<TermInsight>;
}

interface ExecuteTermInsightOptions {
  hoveredTerm: HoveredTerm;
  translation: TermTranslationResult;
  signal: AbortSignal;
  cache: TermInsightCache;
  provider: TermInsightProvider;
}

export async function executeTermInsight({
  hoveredTerm,
  translation,
  signal,
  cache,
  provider,
}: ExecuteTermInsightOptions): Promise<TermInsightResult> {
  const context = resolveTermContext({
    selectedText: hoveredTerm.contextText,
    termOffset: hoveredTerm.termOffset,
    termLength: hoveredTerm.sourceText.length,
    sourceLanguage: translation.sourceLanguage,
  });
  const cacheKey = {
    sourceText: hoveredTerm.sourceText,
    quickTranslation: translation.translatedText,
    sourceLanguage: translation.sourceLanguage,
    targetLanguage: translation.targetLanguage,
    contextText: context.text,
    contextTermOffset: context.termOffset,
  };
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const insight = await provider.analyze(
    {
      sourceText: hoveredTerm.sourceText,
      quickTranslation: translation.translatedText,
      sourceLanguage: translation.sourceLanguage,
      targetLanguage: translation.targetLanguage,
      context,
    },
    signal
  );
  const result = {
    sourceText: hoveredTerm.sourceText,
    quickTranslation: translation.translatedText,
    sourceLanguage: translation.sourceLanguage,
    targetLanguage: translation.targetLanguage,
    context,
    insight,
  };
  cache.set(cacheKey, result);
  return result;
}
