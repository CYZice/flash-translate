import { useEffect } from "react";
import { useLanguageDetectorAvailability } from "@/shared/hooks/use-language-detector-availability";
import { useSettings } from "@/shared/hooks/use-settings";
import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from "@/shared/constants/languages";
import {
  DEFAULT_AI_CONTEXT_SENTENCE_COUNT,
} from "@/shared/utils/ai-context";
import {
  enableExclusionPattern,
  generatePatternId,
  getPageLanguage,
  isUrlExcluded,
  saveSettings,
} from "@/shared/storage/settings";
import { selectContentAppSettings } from "@/shared/storage/settings-selectors";
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

  // Languages
  sourceLanguage: string;
  targetLanguage: string;
  autoDetectEnabled: boolean;
  detectedLanguage: string | null;
  isDetecting: boolean;
  isAiConfigured: boolean;
  editorInputAssistEnabled: boolean;

  // Display state
  isLoading: boolean;
  canDisplay: boolean;
  skipResult: SkipResult;

  // Actions
  dismissCard: () => void;
  permanentlyExcludeSite: () => Promise<void>;
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
  const { selection, isVisible, dismissCard } = useTextSelection(
    settings?.aiContextSentenceCount ?? DEFAULT_AI_CONTEXT_SENTENCE_COUNT
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
  const isDetectorPending = autoDetectSetting && availability === null;

  // Base display conditions
  const canDisplay =
    !isLoading &&
    settings !== null &&
    selection !== null &&
    isVisible &&
    !isExcluded &&
    !isDetectorPending;

  // Evaluate skip rules
  const skipResult = evaluateSkipRules({
    targetLanguage,
    skipSameLanguage,
    autoDetectEnabled,
    detectedLanguage,
    confidence,
    pageLanguage: autoDetectEnabled ? null : getPageLanguage(),
    isDetecting,
    selectedText: selection?.text ?? "",
  });

  // Determine source language based on auto-detect mode
  const sourceLanguage = autoDetectEnabled
    ? effectiveSourceLanguage
    : (settings?.sourceLanguage ?? DEFAULT_SOURCE_LANGUAGE);

  useEffect(() => {
    console.info("[flash-translate][content] settings state", {
      editorInputAssistEnabled:
        settings?.editorInputAssistEnabled ?? false,
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

  const permanentlyExcludeSite = async () => {
    if (!settings) {
      return;
    }

    await saveSettings({
      exclusionPatterns: enableExclusionPattern(
        settings.exclusionPatterns,
        window.location.origin,
        generatePatternId()
      ),
    });
  };

  return {
    // Selection
    selection,
    isVisible,

    // Languages
    sourceLanguage,
    targetLanguage,
    autoDetectEnabled,
    detectedLanguage,
    isDetecting,
    isAiConfigured,
    editorInputAssistEnabled: settings?.editorInputAssistEnabled ?? false,

    // Display state
    isLoading,
    canDisplay,
    skipResult,

    // Actions
    dismissCard,
    permanentlyExcludeSite,
    setOverriddenLanguage,
  };
}
