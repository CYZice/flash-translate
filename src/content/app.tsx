import { EditorInputAssist } from "./components/editor-input-assist";
import { SelectionBadge } from "./components/selection-badge";
import { TranslationCard } from "./components/translation-card";
import { useEditorInputAssist } from "./hooks/use-editor-input-assist";
import { useTranslationFlow } from "./hooks/use-translation-flow";
import { HoveredTermHighlight } from "./term-translation/hovered-term-highlight";
import { useHoveredTermTranslation } from "./term-translation/use-hovered-term-translation";

export default function App() {
  const {
    selection,
    isVisible,
    isPinned,
    togglePin,
    selectionTrigger,
    sourceLanguage,
    targetLanguage,
    autoDetectEnabled,
    autoZhEn,
    detectedLanguage,
    isDetecting,
    isAiConfigured,
    defaultTranslationProvider,
    canDisplay,
    skipResult,
    dismissCard,
    activateCard,
    setOverriddenLanguage,
    editorInputAssistEnabled,
  } = useTranslationFlow();
  const inputAssist = useEditorInputAssist(
    editorInputAssistEnabled,
    autoZhEn ? "en" : sourceLanguage,
    autoZhEn ? "zh" : targetLanguage
  );
  const hoveredTermTranslation = useHoveredTermTranslation({
    selection,
    sourceLanguage,
    targetLanguage,
    enabled:
      canDisplay &&
      isVisible &&
      !skipResult.shouldSkip &&
      !isDetecting &&
      selection !== null,
  });

  // Keep the input hint mounted even when there is no active text selection.
  if (!(canDisplay && selection && isVisible)) {
    return (
      <>
        {selectionTrigger === "badge" &&
        canDisplay &&
        !skipResult.shouldSkip &&
        selection &&
        !isVisible ? (
          <SelectionBadge rect={selection.rect} onActivate={activateCard} />
        ) : null}
        <EditorInputAssist {...inputAssist} />
      </>
    );
  }

  return (
    <>
      <div hidden={skipResult.shouldSkip}>
        <TranslationCard
          autoDetectEnabled={autoDetectEnabled}
          autoZhEn={autoZhEn}
          detectedLanguage={detectedLanguage}
          isDetecting={isDetecting || skipResult.shouldSkip}
          isPinned={isPinned}
          onPinToggle={togglePin}
          isAiConfigured={isAiConfigured}
          defaultTranslationProvider={defaultTranslationProvider}
          onClose={dismissCard}
          onSourceLanguageOverride={setOverriddenLanguage}
          selection={selection}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          termTranslation={hoveredTermTranslation}
        />
      </div>
      <div
        className="pointer-events-none fixed inset-0"
        data-flash-translate-term-overlay=""
      >
        <HoveredTermHighlight
          hoveredTerm={hoveredTermTranslation.hoveredTerm}
        />
      </div>
      <EditorInputAssist {...inputAssist} />
    </>
  );
}
