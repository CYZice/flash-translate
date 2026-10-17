import { useEffect } from "react";
import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from "@/shared/constants/languages";
import { useLanguageDetectorAvailability } from "@/shared/hooks/use-language-detector-availability";
import { useSettings } from "@/shared/hooks/use-settings";
import { getPageLanguage, isUrlExcluded } from "@/shared/storage/settings";
import { selectContentAppSettings } from "@/shared/storage/settings-selectors";
import { DEFAULT_AI_CONTEXT_SENTENCE_COUNT } from "@/shared/utils/ai-context";
import { evaluateSkipRules, type SkipResult } from "./skip-rules";
import { useLanguageDetection } from "./use-language-detection";
import { type SelectionInfo, useTextSelection } from "./use-text-selection";

function getCurrentUrl(): string {
  return window.location.origin + window.location.pathname;
}

export interface TranslationFlowState {
  // Selection
  selection: SelectionInfo | null;
  isVisible: boolean;
  isPinned: boolean;
  selectionTrigger: "immediate" | "badge";

  // Languages
  sourceLanguage: string;
  targetLanguage: string;
  autoDetectEnabled: boolean;
  detectedLanguage: string | null;
  isDetecting: boolean;
  isAiConfigured: boolean;
  defaultTranslationProvider: "chrome-built-in" | "custom-ai";
  editorInputAssistEnabled: boolean;

  // Display state
  isLoading: boolean;
  canDisplay: boolean;
  skipResult: SkipResult;

  // Actions
  dismissCard: () => void;
  activateCard: () => void;
  togglePin: () => void;
  setOverriddenLanguage: (lang: string | null) => void;
}

/**
 * Hook that orchestrates the entire translation flow.
 *
 * Combines:
 * - Text selection detection
 * - Settings management
 * - Language detection (when auto-detect is enabled)
 * - Skip rules evaluation
 *
 * Returns all state needed to render the translation card.
 */
export function useTranslationFlow(): TranslationFlowState {
  const [settings, isLoading] = useSettings(selectContentAppSettings);
  const {
    selection,
    isVisible,
    isPinned,
    togglePin,
    dismissCard,
    activateCard,
  } = useTextSelection(
    settings?.aiContextSentenceCount ?? DEFAULT_AI_CONTEXT_SENTENCE_COUNT,
    settings?.selectionTrigger ?? "badge"
  );

  const autoDetectSetting = settings?.autoDetectLanguage ?? false;
  const { availability } = useLanguageDetectorAvailability({
    enabled: autoDetectSetting,
  });

  const isDetectorUnavailable =
    availability === "unavailable" || availability === "unsupported";
  const autoDetectEnabled = autoDetectSetting && !isDetectorUnavailable;

  const detectionText = selection?.text ?? "";
  const detectionEnabled =
    Boolean(selection?.text) &&
    isVisible &&
    autoDetectEnabled &&
    availability !== null;

  const {
    effectiveSourceLanguage,
    detectedLanguage,
    confidence,
    isDetecting,
    setOverriddenLanguage,
  } = useLanguageDetection({
    text: detectionText,
    enabled: detectionEnabled,
    fallbackLanguage: settings?.sourceLanguage ?? DEFAULT_SOURCE_LANGUAGE,
  });

  // Compute derived state
  const targetLanguage = settings?.targetLanguage ?? DEFAULT_TARGET_LANGUAGE;
  const skipSameLanguage = settings?.skipSameLanguage ?? true;
  const exclusionPatterns = settings?.exclusionPatterns ?? [];
  const isAiConfigured = Boolean(
    settings?.aiBaseUrl.trim() && settings?.aiModel.trim()
  );

  const isExcluded = isUrlExcluded(getCurrentUrl(), exclusionPatterns);
  // Determine source language before evaluating display skip rules so an
  // explicitly configured same-language pair can be hidden before the card
  // attempts an unsupported translation.
  const sourceLanguage = autoDetectEnabled
    ? effectiveSourceLanguage
    : (settings?.sourceLanguage ?? DEFAULT_SOURCE_LANGUAGE);

  // Base display conditions
  const canDisplay =
    !isLoading && settings !== null && selection !== null && !isExcluded;

  // Evaluate skip rules
  const skipResult = evaluateSkipRules({
    sourceLanguage,
    targetLanguage,
    skipSameLanguage,
    autoDetectEnabled,
    detectedLanguage,
    confidence,
    pageLanguage: autoDetectEnabled ? null : getPageLanguage(),
    isDetecting,
    selectedText: selection?.text ?? "",
  });

  useEffect(() => {
    console.info("[flash-translate][content] settings state", {
      editorInputAssistEnabled: settings?.editorInputAssistEnabled ?? false,
      hasSettings: settings !== null,
      isLoading,
      sourceLanguage,
      targetLanguage,
    });
  }, [
    isLoading,
    settings?.editorInputAssistEnabled,
    settings,
    sourceLanguage,
    targetLanguage,
  ]);

  return {
    // Selection
    selection,
    isVisible,
    isPinned,
    selectionTrigger: settings?.selectionTrigger ?? "badge",

    // Languages
    sourceLanguage,
    targetLanguage,
    autoDetectEnabled,
    detectedLanguage,
    isDetecting,
    isAiConfigured,
    defaultTranslationProvider:
      settings?.defaultTranslationProvider ?? "chrome-built-in",
    editorInputAssistEnabled: settings?.editorInputAssistEnabled ?? false,

    // Display state
    isLoading,
    canDisplay,
    skipResult,

    // Actions
    dismissCard,
    activateCard,
    togglePin,
    setOverriddenLanguage,
  };
}
