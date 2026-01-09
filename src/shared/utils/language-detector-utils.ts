// Pure utility functions for language detection logic
// These are extracted for testability (no DOM or API dependencies)

import { getAllLanguageCodes } from "@/shared/constants/languages";
import { normalizeLanguageCode } from "@/shared/storage/settings";

/**
 * Internal availability status for language detection
 * Maps from Chrome's Availability type to our internal representation
 */
export type LanguageDetectionAvailability =
  | "available" // Ready to use immediately
  | "after-download" // Available after model download (downloadable or downloading)
  | "unavailable" // Not available for this configuration
  | "unsupported"; // API not supported in this browser

/**
 * Normalized result of language detection
 * Unlike Chrome's LanguageDetectionResult (with optional fields),
 * this type guarantees non-undefined values for application use
 */
export interface NormalizedLanguageDetectionResult {
  detectedLanguage: string | null;
  confidence: number;
}

/**
 * Default minimum text length for reliable detection (for Latin scripts)
 */
export const DEFAULT_MIN_TEXT_LENGTH = 5;

/**
 * Minimum text length for high-density scripts (CJK, Abjad, Abugida)
 */
export const HIGH_DENSITY_MIN_TEXT_LENGTH = 1;

/**
 * Regular expression to detect high information density scripts:
 * - CJK: Chinese, Japanese (Hiragana, Katakana), Korean (Hangul)
 * - Abjad: Arabic, Hebrew (consonant-based, vowels often omitted)
 * - Abugida: Devanagari, Thai, Myanmar, Tibetan, Bengali (syllabic)
 */
export const HIGH_DENSITY_SCRIPT_REGEX =
  /[\u3000-\u9fff\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff\u0600-\u06ff\u0590-\u05ff\u0900-\u097f\u0e00-\u0e7f\u1000-\u109f\u0f00-\u0fff\u0980-\u09ff]/;

/**
 * Check if text contains high information density scripts
 */
export function containsHighDensityScript(text: string): boolean {
  return HIGH_DENSITY_SCRIPT_REGEX.test(text);
}

/**
 * Get appropriate minimum text length based on script type
 */
export function getMinTextLengthForDetection(text: string): number {
  return containsHighDensityScript(text)
    ? HIGH_DENSITY_MIN_TEXT_LENGTH
    : DEFAULT_MIN_TEXT_LENGTH;
}

/**
 * Default confidence threshold for accepting detection result
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

/**
 * Map Chrome API availability status to internal enum
 * Uses Availability type from @types/dom-chromium-ai
 */
export function mapDetectorAvailability(
  chromeAvailability: Availability
): LanguageDetectionAvailability {
  switch (chromeAvailability) {
    case "available":
      return "available";
    case "downloadable":
    case "downloading":
      return "after-download";
    case "unavailable":
      return "unavailable";
    default:
      return "unavailable";
  }
}

/**
 * Select the language with highest confidence from detection results
 */
export function selectBestLanguage(
  results: Array<{ detectedLanguage?: string; confidence?: number }>
): NormalizedLanguageDetectionResult {
  if (results.length === 0) {
    return { detectedLanguage: null, confidence: 0 };
  }

  // Find the result with highest confidence
  let best = results[0];
  for (const result of results) {
    if ((result.confidence ?? 0) > (best.confidence ?? 0)) {
      best = result;
    }
  }

  return {
    detectedLanguage: best.detectedLanguage ?? null,
    confidence: best.confidence ?? 0,
  };
}

/**
 * Normalize detected language code to match supported languages
 * Returns null if the language is not in the supported list
 */
export function normalizeDetectedLanguage(
  detectedLanguage: string,
  supportedLanguages: string[] = getAllLanguageCodes()
): string | null {
  const normalized = normalizeLanguageCode(detectedLanguage);
  return supportedLanguages.includes(normalized) ? normalized : null;
}

/**
 * Check if text is long enough for reliable language detection
 */
export function isTextSufficientForDetection(
  text: string,
  minLength: number = DEFAULT_MIN_TEXT_LENGTH
): boolean {
  return text.trim().length >= minLength;
}

/**
 * Determine the effective source language to use for translation
 * Priority: overridden > detected (if confident) > fallback
 */
export function computeEffectiveSourceLanguage(
  detectedLanguage: string | null,
  confidence: number,
  overriddenLanguage: string | null,
  fallbackLanguage: string,
  confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): string {
  // User override takes highest priority
  if (overriddenLanguage !== null) {
    return overriddenLanguage;
  }

  // Use detected language if confidence is above threshold
  if (detectedLanguage !== null && confidence >= confidenceThreshold) {
    return detectedLanguage;
  }

  // Fall back to user setting
  return fallbackLanguage;
}

/**
 * Check if detection should be skipped based on conditions
 * Uses dynamic minimum text length based on script type
 */
export function shouldSkipDetection(text: string, enabled: boolean): boolean {
  if (!enabled) {
    return true;
  }
  const minLength = getMinTextLengthForDetection(text);
  return !isTextSufficientForDetection(text, minLength);
}

/**
 * Create an error for unsupported Language Detector API
 */
export function createDetectorUnsupportedError(): Error {
  return new Error("Language Detector API is not supported in this browser");
}

/**
 * Create an error for unavailable Language Detector API
 */
export function createDetectorUnavailableError(): Error {
  return new Error("Language Detector API is not available");
}
