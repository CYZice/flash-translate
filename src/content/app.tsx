import type { CSSProperties } from "react";
import { positionSelectionBadge } from "@/shared/selection/selection-geometry";
import { EditorInputAssist } from "./components/editor-input-assist";
import { TranslationCard } from "./components/translation-card";
import { useEditorInputAssist } from "./hooks/use-editor-input-assist";
import { useTranslationFlow } from "./hooks/use-translation-flow";
import { HoveredTermHighlight } from "./term-translation/hovered-term-highlight";
import { useHoveredTermTranslation } from "./term-translation/use-hovered-term-translation";

function getBadgePosition(rect: DOMRect): CSSProperties {
  const point = positionSelectionBadge(
    rect,
    { width: 28, height: 28 },
    { width: window.innerWidth, height: window.innerHeight }
  );
  return { left: `${point.x}px`, top: `${point.y}px` };
}

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
    sourceLanguage,
    targetLanguage
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
          <button
            aria-label="翻译选中文本"
            className="fixed z-[2147483647] flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.2)] transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={activateCard}
            style={getBadgePosition(selection.rect)}
            type="button"
          >
            <img
              alt=""
              className="h-3.5 w-3.5"
              height={14}
              src={chrome.runtime.getURL("icons/icon-32.png")}
              width={14}
            />
          </button>
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
