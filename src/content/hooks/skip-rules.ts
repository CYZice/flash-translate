import { isLanguageMatch } from "@/shared/storage/settings";
import { DEFAULT_CONFIDENCE_THRESHOLD } from "@/shared/utils/language-detector-utils";

export type SkipReason =
  | "same-as-source-language"
  | "same-as-page-language"
  | "same-as-detected-language"
  | "detecting-in-progress";

export interface SkipResult {
  shouldSkip: boolean;
  reason: SkipReason | null;
}

export interface SkipContext {
  sourceLanguage?: string;
  targetLanguage: string;
  skipSameLanguage: boolean;
  autoDetectEnabled: boolean;
  detectedLanguage: string | null;
  confidence: number;
  pageLanguage: string | null;
  isDetecting: boolean;
  selectedText?: string;
}

/**
 * Evaluate skip rules for translation.
 *
 * @param context - The context containing all relevant state
 * @returns SkipResult with shouldSkip flag and reason
 *
 * Skip rules:
 * 1. If auto-detect is enabled and detection is in progress, wait (skip)
 * 2. If auto-detect is enabled and the detected language matches the target
 *    language with sufficient confidence, always skip because Chrome
 *    Translator cannot translate a language into itself.
 * 3. If auto-detect is disabled and skip same language is on:
 *    - Skip if page language matches target language
 */
export function evaluateSkipRules(context: SkipContext): SkipResult {
  const {
    sourceLanguage,
    targetLanguage,
    skipSameLanguage,
    autoDetectEnabled,
    detectedLanguage,
    confidence,
    pageLanguage,
    isDetecting,
  } = context;

  // Chrome Translator does not support translating a language into itself.
  // Skip before rendering the card so the user does not see a late API error.
  if (
    !autoDetectEnabled &&
    sourceLanguage !== undefined &&
    isLanguageMatch(sourceLanguage, targetLanguage)
  ) {
    return { shouldSkip: true, reason: "same-as-source-language" };
  }

  // Rule 1: If auto-detect is enabled and detection is in progress, wait
  if (autoDetectEnabled && isDetecting) {
    return { shouldSkip: true, reason: "detecting-in-progress" };
  }

  // Rule 2: Auto-detect ON - use detected language for skip check
  if (
    autoDetectEnabled &&
    detectedLanguage !== null &&
    confidence >= DEFAULT_CONFIDENCE_THRESHOLD &&
    isLanguageMatch(detectedLanguage, targetLanguage)
  ) {
    return { shouldSkip: true, reason: "same-as-detected-language" };
  }

  // Rule 3: Auto-detect OFF - use page language for skip check
  if (
    !autoDetectEnabled &&
    skipSameLanguage &&
    isLanguageMatch(pageLanguage, targetLanguage)
  ) {
    return { shouldSkip: true, reason: "same-as-page-language" };
  }

  return { shouldSkip: false, reason: null };
}
