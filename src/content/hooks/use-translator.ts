import { useCallback, useEffect, useRef, useState } from "react";
import {
  type TranslationAvailabilityStatus,
  translatorManager,
} from "@/shared/utils/translator";
import { isValidTranslationText } from "@/shared/utils/translator-utils";
import { openAiCompatibleTranslator } from "../translation-providers/openai-compatible";
import {
  executeStreamingTranslation,
  type TranslationContext,
  type TranslationFunctions,
} from "./translator-executor";

interface UseTranslatorOptions {
  sourceLanguage: string;
  targetLanguage: string;
  provider: "chrome-built-in" | "custom-ai";
  resetKey?: string;
}

interface TranslatorState {
  result: string;
  isLoading: boolean;
  error: Error | null;
  availability: TranslationAvailabilityStatus;
}

export function useTranslator({
  sourceLanguage,
  targetLanguage,
  provider,
  resetKey,
}: UseTranslatorOptions) {
  const [state, setState] = useState<TranslatorState>({
    result: "",
    isLoading: false,
    error: null,
    availability: "available",
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey intentionally triggers cleanup
  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState((prev) => ({
      ...prev,
      result: "",
      isLoading: false,
      error: null,
    }));
  }, [resetKey]);

  // Check availability when language changes
  useEffect(() => {
    let cancelled = false;

    if (provider === "custom-ai") {
      setState((prev) => ({ ...prev, availability: "available" }));
      return () => {
        cancelled = true;
      };
    }

    const checkAvailability = async () => {
      const availability = await translatorManager.checkAvailability(
        sourceLanguage,
        targetLanguage
      );
      if (!cancelled) {
        setState((prev) => ({ ...prev, availability }));
      }
    };

    checkAvailability();
    return () => {
      cancelled = true;
    };
  }, [sourceLanguage, targetLanguage, provider]);

  const translate = useCallback(
    async (text: string, context?: TranslationContext) => {
      if (!isValidTranslationText(text)) {
        return;
      }

      // Cancel previous translation if still running
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState((prev) => ({
        ...prev,
        result: "",
        isLoading: true,
        error: null,
      }));

      const options = {
        text,
        sourceLanguage,
        targetLanguage,
        signal: abortController.signal,
        context,
      };

      const translator: TranslationFunctions =
        provider === "custom-ai"
          ? openAiCompatibleTranslator
          : translatorManager;

      const executionResult = await executeStreamingTranslation(
        options,
        translator,
        {
          onChunk: (result) => setState((prev) => ({ ...prev, result })),
        }
      );

      // Avoid an older aborted request clearing a newer request's controller.
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }

      // Handle aborted translation (new translation started)
      if (executionResult.type === "aborted") {
        return;
      }

      // Update state based on result
      if (executionResult.type === "error") {
        setState((prev) => ({
          ...prev,
          result: "",
          isLoading: false,
          error: executionResult.error,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          result: executionResult.result,
          isLoading: false,
          error: null,
        }));
      }
    },
    [provider, sourceLanguage, targetLanguage]
  );

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState((prev) => ({
      ...prev,
      result: "",
      isLoading: false,
      error: null,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { ...state, translate, reset };
}
