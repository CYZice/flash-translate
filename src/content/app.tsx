import { TranslationCard } from "./components/translation-card";
import { useTranslationFlow } from "./hooks/use-translation-flow";
import { HoveredTermTooltip } from "./term-translation/hovered-term-tooltip";
import { useHoveredTermTranslation } from "./term-translation/use-hovered-term-translation";

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
    permanentlyExcludeSite,
    setOverriddenLanguage,
  } = useTranslationFlow();

  const hoveredTermTranslation = useHoveredTermTranslation({
    selection,
    sourceLanguage,
    targetLanguage,
    enabled:
      canDisplay &&
      !skipResult.shouldSkip &&
      !isDetecting &&
      selection !== null,
  });

  // Early return if cannot display
  if (!canDisplay || skipResult.shouldSkip || !selection) {
    return null;
  }

  return (
    <>
      <TranslationCard
        autoDetectEnabled={autoDetectEnabled}
        detectedLanguage={detectedLanguage}
        isDetecting={isDetecting}
        onClose={dismissCard}
        onDisablePage={temporarilyDisablePage}
        onExcludeSite={permanentlyExcludeSite}
        onSourceLanguageOverride={setOverriddenLanguage}
        selection={selection}
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
      />
      <HoveredTermTooltip state={hoveredTermTranslation} />
    </>
  );
}
