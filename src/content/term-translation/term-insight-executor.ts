import type { HoveredTerm, TermTranslationResult } from "./hovered-term";
import { resolveTermContext, type TermContext } from "./term-context";
import type {
  TermInsight,
  TermInsightProgress,
  TermInsightResult,
} from "./term-insight";
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
    signal: AbortSignal,
    onProgress: (progress: TermInsightProgress) => void
  ) => Promise<TermInsight>;
}

interface ExecuteTermInsightOptions {
  hoveredTerm: HoveredTerm;
  translation: TermTranslationResult;
  signal: AbortSignal;
  cache: TermInsightCache;
  provider: TermInsightProvider;
  onProgress: (progress: TermInsightProgress) => void;
}

export async function executeTermInsight({
  hoveredTerm,
  translation,
  signal,
  cache,
  provider,
  onProgress,
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
    onProgress(cachedResult.insight);
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
    signal,
    onProgress
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
