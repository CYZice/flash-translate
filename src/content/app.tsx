import { useSettings } from "@/shared/hooks/use-settings";
import {
  getPageLanguage,
  isUrlExcluded,
  shouldSkipTranslation,
} from "@/shared/storage/settings";
import { selectContentAppSettings } from "@/shared/storage/settings-selectors";
import { TranslationCard } from "./components/translation-card";
import { useTextSelection } from "./hooks/use-text-selection";

function getCurrentUrl(): string {
  return window.location.origin + window.location.pathname;
}

export default function App() {
  const { selection, isVisible, dismissPopup, clearSelection } =
    useTextSelection();
  const [settings, isLoading] = useSettings(selectContentAppSettings);

  // Wait for settings to load
  if (isLoading || !settings) {
    return null;
  }

  const {
    sourceLanguage,
    targetLanguage,
    skipSameLanguage,
    exclusionPatterns,
    autoDetectLanguage,
  } = settings;

  // Check if current URL is excluded
  if (isUrlExcluded(getCurrentUrl(), exclusionPatterns)) {
    return null;
  }

  if (!(selection && isVisible)) {
    return null;
  }

  // Skip translation if page language matches target language
  const pageLanguage = getPageLanguage();
  if (shouldSkipTranslation(targetLanguage, skipSameLanguage, pageLanguage)) {
    return null;
  }

  return (
    <TranslationCard
      autoDetectLanguage={autoDetectLanguage}
      onClose={dismissPopup}
      onExcludeSite={clearSelection}
      selection={selection}
      sourceLanguage={sourceLanguage}
      targetLanguage={targetLanguage}
    />
  );
}
