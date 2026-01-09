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
 * Default minimum text length for reliable detection
 */
export const DEFAULT_MIN_TEXT_LENGTH = 10;

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
 */
export function shouldSkipDetection(
  text: string,
  enabled: boolean,
  minTextLength: number = DEFAULT_MIN_TEXT_LENGTH
): boolean {
  if (!enabled) {
    return true;
  }
  return !isTextSufficientForDetection(text, minTextLength);
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
