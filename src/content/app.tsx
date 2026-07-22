import { TranslationCard } from "./components/translation-card";
import { useTranslationFlow } from "./hooks/use-translation-flow";

export default function App() {
  const {
    selection,
    sourceLanguage,
    targetLanguage,
    autoDetectEnabled,
    detectedLanguage,
    isDetecting,
    canDisplay,
    skipResult,
    dismissCard,
    temporarilyDisablePage,
    setOverriddenLanguage,
  } = useTranslationFlow();

  // Early return if cannot display
  if (!canDisplay || skipResult.shouldSkip || !selection) {
    return null;
  }

  return (
    <TranslationCard
      autoDetectEnabled={autoDetectEnabled}
      detectedLanguage={detectedLanguage}
      isDetecting={isDetecting}
      onClose={dismissCard}
      onDisablePage={temporarilyDisablePage}
      onSourceLanguageOverride={setOverriddenLanguage}
      selection={selection}
      sourceLanguage={sourceLanguage}
      targetLanguage={targetLanguage}
    />
  );
}
