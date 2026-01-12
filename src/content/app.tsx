import { useLanguageDetectorAvailability } from "@/shared/hooks/use-language-detector-availability";
import { useSettings } from "@/shared/hooks/use-settings";
import {
  getPageLanguage,
  isLanguageMatch,
  isUrlExcluded,
  shouldSkipTranslation,
} from "@/shared/storage/settings";
import { selectContentAppSettings } from "@/shared/storage/settings-selectors";
import { DEFAULT_CONFIDENCE_THRESHOLD } from "@/shared/utils/language-detector-utils";
import { TranslationCard } from "./components/translation-card";
import { useLanguageDetection } from "./hooks/use-language-detection";
import {
  type SelectionInfo,
  useTextSelection,
} from "./hooks/use-text-selection";

function getCurrentUrl(): string {
  return window.location.origin + window.location.pathname;
}

function canDisplayCard(
  selection: SelectionInfo | null,
  isVisible: boolean,
  isExcluded: boolean,
  isDetectorPending: boolean
): selection is SelectionInfo {
  return Boolean(selection) && isVisible && !isExcluded && !isDetectorPending;
}

function isSkippedByPageLanguage(
  targetLanguage: string,
  skipSameLanguage: boolean,
  autoDetectEnabled: boolean
): boolean {
  const pageLanguage = autoDetectEnabled ? null : getPageLanguage();
  return shouldSkipTranslation(targetLanguage, skipSameLanguage, pageLanguage);
}

function isSkippedByDetectedLanguage({
  skipSameLanguage,
  autoDetectEnabled,
  isDetecting,
  detectedLanguage,
  confidence,
  targetLanguage,
}: {
  skipSameLanguage: boolean;
  autoDetectEnabled: boolean;
  isDetecting: boolean;
  detectedLanguage: string | null;
  confidence: number;
  targetLanguage: string;
}): boolean {
  if (!(skipSameLanguage && autoDetectEnabled) || isDetecting) {
    return false;
  }

  if (detectedLanguage === null) {
    return false;
  }

  if (confidence < DEFAULT_CONFIDENCE_THRESHOLD) {
    return false;
  }

  return isLanguageMatch(detectedLanguage, targetLanguage);
}

export default function App() {
  const { selection, isVisible, dismissCard, clearSelection } =
    useTextSelection();
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

  // Wait for settings to load
  if (isLoading || !settings) {
    return null;
  }

  const {
    sourceLanguage: fallbackSourceLanguage,
    targetLanguage,
    skipSameLanguage,
    exclusionPatterns,
    autoDetectLanguage,
  } = settings;

  const isExcluded = isUrlExcluded(getCurrentUrl(), exclusionPatterns);
  const isDetectorPending = autoDetectLanguage && availability === null;

  // Display gating
  if (!canDisplayCard(selection, isVisible, isExcluded, isDetectorPending)) {
    return null;
  }

  // Skip translation based on HTML lang only when auto-detect is disabled/unavailable
  const shouldSkipByPageLanguage = isSkippedByPageLanguage(
    targetLanguage,
    skipSameLanguage,
    autoDetectEnabled
  );
  const shouldSkipDetectedTranslation = isSkippedByDetectedLanguage({
    skipSameLanguage,
    autoDetectEnabled,
    isDetecting,
    detectedLanguage,
    confidence,
    targetLanguage,
  });

  if (shouldSkipByPageLanguage || shouldSkipDetectedTranslation) {
    return null;
  }

  return (
    <TranslationCard
      autoDetectEnabled={autoDetectEnabled}
      detectedLanguage={detectedLanguage}
      isDetecting={isDetecting}
      onClose={dismissCard}
      onExcludeSite={clearSelection}
      onSourceLanguageOverride={setOverriddenLanguage}
      selection={selection}
      sourceLanguage={
        autoDetectEnabled ? effectiveSourceLanguage : fallbackSourceLanguage
      }
      targetLanguage={targetLanguage}
    />
  );
}
