import { useEffect, useState } from "react";
import {
  type LanguageDetectionAvailability,
  languageDetectorManager,
} from "@/shared/utils/language-detector";
import {
  computeEffectiveSourceLanguage,
  DEFAULT_CONFIDENCE_THRESHOLD,
  shouldSkipDetection,
} from "@/shared/utils/language-detector-utils";

interface UseLanguageDetectionOptions {
  text: string;
  enabled: boolean;
  fallbackLanguage: string;
}

interface LanguageDetectionState {
  detectedLanguage: string | null;
  confidence: number;
  isDetecting: boolean;
  availability: LanguageDetectionAvailability;
  error: Error | null;
  overriddenLanguage: string | null;
}

export interface UseLanguageDetectionResult {
  detectedLanguage: string | null;
  confidence: number;
  effectiveSourceLanguage: string;
  isDetecting: boolean;
  availability: LanguageDetectionAvailability;
  error: Error | null;
  overriddenLanguage: string | null;
  setOverriddenLanguage: (lang: string | null) => void;
}

export function useLanguageDetection({
  text,
  enabled,
  fallbackLanguage,
}: UseLanguageDetectionOptions): UseLanguageDetectionResult {
  const [state, setState] = useState<LanguageDetectionState>({
    detectedLanguage: null,
    confidence: 0,
    isDetecting: false,
    availability: "available",
    error: null,
    overriddenLanguage: null,
  });

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      const availability = await languageDetectorManager.checkAvailability();
      setState((prev) => ({ ...prev, availability }));
    };

    checkAvailability();
  }, []);

  // Reset override when text changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: text change is intentionally tracked to reset override
  useEffect(() => {
    setState((prev) => ({ ...prev, overriddenLanguage: null }));
  }, [text]);

  // Perform language detection
  useEffect(() => {
    // Skip if detection should be skipped
    if (
      shouldSkipDetection(text, enabled) ||
      state.overriddenLanguage !== null
    ) {
      setState((prev) => ({
        ...prev,
        detectedLanguage: null,
        confidence: 0,
        isDetecting: false,
        error: null,
      }));
      return;
    }

    const controller = new AbortController();
    const releaseResource = languageDetectorManager.retain();

    const detectLanguage = async () => {
      setState((prev) => ({
        ...prev,
        isDetecting: true,
        error: null,
      }));

      try {
        const result = await languageDetectorManager.detect(
          text,
          controller.signal
        );

        // Check if aborted
        if (controller.signal.aborted) {
          return;
        }

        setState((prev) => ({
          ...prev,
          detectedLanguage: result.detectedLanguage,
          confidence: result.confidence,
          isDetecting: false,
          error: null,
        }));
      } catch (error) {
        // Ignore abort errors
        if (controller.signal.aborted) {
          return;
        }

        setState((prev) => ({
          ...prev,
          detectedLanguage: null,
          confidence: 0,
          isDetecting: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      }
    };

    detectLanguage();
    return () => {
      controller.abort();
      releaseResource();
    };
  }, [text, enabled, state.overriddenLanguage]);

  const setOverriddenLanguage = (lang: string | null) => {
    setState((prev) => ({ ...prev, overriddenLanguage: lang }));
  };

  // Compute effective source language
  const effectiveSourceLanguage = computeEffectiveSourceLanguage(
    state.detectedLanguage,
    state.confidence,
    state.overriddenLanguage,
    fallbackLanguage,
    DEFAULT_CONFIDENCE_THRESHOLD
  );

  return {
    detectedLanguage: state.detectedLanguage,
    confidence: state.confidence,
    effectiveSourceLanguage,
    isDetecting: state.isDetecting && state.overriddenLanguage === null,
    availability: state.availability,
    error: state.error,
    overriddenLanguage: state.overriddenLanguage,
    setOverriddenLanguage,
  };
}
