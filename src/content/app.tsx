import { EditorInputAssist } from "./components/editor-input-assist";
import { TranslationCard } from "./components/translation-card";
import { useEditorInputAssist } from "./hooks/use-editor-input-assist";
import { useTranslationFlow } from "./hooks/use-translation-flow";
import { HoveredTermHighlight } from "./term-translation/hovered-term-highlight";
import { useHoveredTermTranslation } from "./term-translation/use-hovered-term-translation";

export default function App() {
  const {
    selection,
    sourceLanguage,
    targetLanguage,
    autoDetectEnabled,
    detectedLanguage,
    isDetecting,
    isAiConfigured,
    canDisplay,
    skipResult,
    dismissCard,
    permanentlyExcludeSite,
    setOverriddenLanguage,
    editorInputAssistEnabled,
  } = useTranslationFlow();
  const inputAssist = useEditorInputAssist(
    editorInputAssistEnabled,
    sourceLanguage,
    targetLanguage
  );
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

  // Keep the input hint mounted even when there is no active text selection.
  if (!canDisplay || skipResult.shouldSkip || !selection) {
    return <EditorInputAssist {...inputAssist} />;
  }

  return (
    <>
      <TranslationCard
        autoDetectEnabled={autoDetectEnabled}
        detectedLanguage={detectedLanguage}
        isDetecting={isDetecting}
        isAiConfigured={isAiConfigured}
        onClose={dismissCard}
        onExcludeSite={permanentlyExcludeSite}
        onSourceLanguageOverride={setOverriddenLanguage}
        selection={selection}
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
        termTranslation={hoveredTermTranslation}
      />
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
