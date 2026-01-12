import { useLanguageDetectorAvailability } from "@/shared/hooks/use-language-detector-availability";
import { useSettings } from "@/shared/hooks/use-settings";
import { getPageLanguage, isUrlExcluded } from "@/shared/storage/settings";
import { selectContentAppSettings } from "@/shared/storage/settings-selectors";
import { TranslationCard } from "./components/translation-card";
import { evaluateSkipRules } from "./hooks/skip-rules";
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
  } = settings;

  const isExcluded = isUrlExcluded(getCurrentUrl(), exclusionPatterns);
  const isDetectorPending = autoDetectSetting && availability === null;

  // Display gating
  if (!canDisplayCard(selection, isVisible, isExcluded, isDetectorPending)) {
    return null;
  }

  // Evaluate skip rules using unified logic
  const skipResult = evaluateSkipRules({
    targetLanguage,
    skipSameLanguage,
    autoDetectEnabled,
    detectedLanguage,
    confidence,
    pageLanguage: autoDetectEnabled ? null : getPageLanguage(),
    isDetecting,
  });

  if (skipResult.shouldSkip) {
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
