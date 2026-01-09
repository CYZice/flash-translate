import { useEffect, useRef, useState } from "react";
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

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastDetectedTextRef = useRef<string | null>(null);

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
    if (shouldSkipDetection(text, enabled)) {
      setState((prev) => ({
        ...prev,
        detectedLanguage: null,
        confidence: 0,
        isDetecting: false,
        error: null,
      }));
      return;
    }

    // Skip if same text was already detected
    if (lastDetectedTextRef.current === text) {
      return;
    }

    // Cancel previous detection
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const detectLanguage = async () => {
      setState((prev) => ({
        ...prev,
        isDetecting: true,
        error: null,
      }));

      try {
        const result = await languageDetectorManager.detect(text);

        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        lastDetectedTextRef.current = text;

        setState((prev) => ({
          ...prev,
          detectedLanguage: result.detectedLanguage,
          confidence: result.confidence,
          isDetecting: false,
          error: null,
        }));
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === "AbortError") {
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
  }, [text, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

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
    isDetecting: state.isDetecting,
    availability: state.availability,
    error: state.error,
    overriddenLanguage: state.overriddenLanguage,
    setOverriddenLanguage,
  };
}
