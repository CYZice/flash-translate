import type { HoveredTerm, TermTranslationResult } from "./hovered-term";
import type { TermTranslationCache } from "./term-translation-cache";

export interface TermTranslator {
  translate: (
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    signal?: AbortSignal
  ) => Promise<string>;
}

interface ExecuteTermTranslationOptions {
  hoveredTerm: HoveredTerm;
  sourceLanguage: string;
  targetLanguage: string;
  signal: AbortSignal;
  cache: TermTranslationCache;
  translator: TermTranslator;
}

function createResult(
  hoveredTerm: HoveredTerm,
  translatedText: string,
  sourceLanguage: string,
  targetLanguage: string
): TermTranslationResult {
  return {
    sourceText: hoveredTerm.sourceText,
    translatedText,
    contextText: hoveredTerm.contextText,
    sourceLanguage,
    targetLanguage,
  };
}

export async function executeTermTranslation({
  hoveredTerm,
  sourceLanguage,
  targetLanguage,
  signal,
  cache,
  translator,
}: ExecuteTermTranslationOptions): Promise<TermTranslationResult> {
  const cacheKey = {
    sourceText: hoveredTerm.sourceText,
    sourceLanguage,
    targetLanguage,
  };
  const cachedTranslation = cache.get(cacheKey);
  if (cachedTranslation !== null) {
    return createResult(
      hoveredTerm,
      cachedTranslation,
      sourceLanguage,
      targetLanguage
    );
  }

  const translatedText = await translator.translate(
    hoveredTerm.sourceText,
    sourceLanguage,
    targetLanguage,
    signal
  );
  cache.set(cacheKey, translatedText);
  return createResult(
    hoveredTerm,
    translatedText,
    sourceLanguage,
    targetLanguage
  );
}
