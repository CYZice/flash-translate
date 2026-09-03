import { isLanguageMatch } from "@/shared/storage/settings";
import { DEFAULT_CONFIDENCE_THRESHOLD } from "@/shared/utils/language-detector-utils";
import { hasMixedLanguageSelection } from "./selection-language";

export type SkipReason =
  | "same-as-page-language"
  | "same-as-detected-language"
  | "detecting-in-progress";

export interface SkipResult {
  shouldSkip: boolean;
  reason: SkipReason | null;
}

export interface SkipContext {
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
 * 2. If auto-detect is enabled and skip same language is on:
 *    - Skip if detected language matches target language (with sufficient confidence)
 * 3. If auto-detect is disabled and skip same language is on:
 *    - Skip if page language matches target language
 */
export function evaluateSkipRules(context: SkipContext): SkipResult {
  const {
    targetLanguage,
    skipSameLanguage,
    autoDetectEnabled,
    detectedLanguage,
    confidence,
    pageLanguage,
    isDetecting,
  } = context;

  // Rule 1: If auto-detect is enabled and detection is in progress, wait
  if (autoDetectEnabled && isDetecting) {
    return { shouldSkip: true, reason: "detecting-in-progress" };
  }

  if (skipSameLanguage && hasMixedLanguageSelection(context.selectedText ?? "", targetLanguage)) {
    return { shouldSkip: false, reason: null };
  }

  // Rule 2: Auto-detect ON - use detected language for skip check
  if (
    autoDetectEnabled &&
    skipSameLanguage &&
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
