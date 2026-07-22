import { useState } from "react";
import { useLanguageDetectorAvailability } from "@/shared/hooks/use-language-detector-availability";
import { useSettings } from "@/shared/hooks/use-settings";
import { getPageLanguage, isUrlExcluded } from "@/shared/storage/settings";
import { selectContentAppSettings } from "@/shared/storage/settings-selectors";
import { evaluateSkipRules, type SkipResult } from "./skip-rules";
import { useLanguageDetection } from "./use-language-detection";
import { usePageRevision } from "./use-page-revision";
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

  // Display state
  isLoading: boolean;
  canDisplay: boolean;
  skipResult: SkipResult;

  // Actions
  dismissCard: () => void;
  temporarilyDisablePage: () => void;
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
  const { selection, isVisible, dismissCard, clearSelection } =
    useTextSelection();
  const pageRevision = usePageRevision();
  const [disabledPageRevision, setDisabledPageRevision] = useState<
    number | null
  >(null);

  const [settings, isLoading] = useSettings(selectContentAppSettings);

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
    fallbackLanguage: settings?.sourceLanguage ?? "en",
  });

  // Compute derived state
  const targetLanguage = settings?.targetLanguage ?? "ja";
  const skipSameLanguage = settings?.skipSameLanguage ?? true;
  const exclusionPatterns = settings?.exclusionPatterns ?? [];

  const isExcluded = isUrlExcluded(getCurrentUrl(), exclusionPatterns);
  const isTemporarilyDisabled = disabledPageRevision === pageRevision;
  const isDetectorPending = autoDetectSetting && availability === null;

  // Base display conditions
  const canDisplay =
    !isLoading &&
    settings !== null &&
    selection !== null &&
    isVisible &&
    !isExcluded &&
    !isTemporarilyDisabled &&
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
  });

  // Determine source language based on auto-detect mode
  const sourceLanguage = autoDetectEnabled
    ? effectiveSourceLanguage
    : (settings?.sourceLanguage ?? "en");

  const temporarilyDisablePage = () => {
    setDisabledPageRevision(pageRevision);
    clearSelection();
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

    // Display state
    isLoading,
    canDisplay,
    skipResult,

    // Actions
    dismissCard,
    temporarilyDisablePage,
    setOverriddenLanguage,
  };
}
