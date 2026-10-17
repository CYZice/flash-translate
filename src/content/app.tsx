import type { CSSProperties } from "react";
import { EditorInputAssist } from "./components/editor-input-assist";
import { TranslationCard } from "./components/translation-card";
import { useEditorInputAssist } from "./hooks/use-editor-input-assist";
import { useTranslationFlow } from "./hooks/use-translation-flow";
import { HoveredTermHighlight } from "./term-translation/hovered-term-highlight";
import { useHoveredTermTranslation } from "./term-translation/use-hovered-term-translation";

function getBadgePosition(rect: DOMRect): CSSProperties {
  const badgeWidth = 32;
  const badgeHeight = 32;
  const gap = 6;
  const left = Math.min(
    Math.max(8, rect.right - badgeWidth),
    window.innerWidth - badgeWidth - 8
  );
  const below = rect.bottom + gap;
  const top =
    below + badgeHeight <= window.innerHeight - 8
      ? below
      : Math.max(8, rect.top - badgeHeight - gap);
  return { left: `${left}px`, top: `${top}px` };
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
            className="fixed z-[2147483647] flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.2)] transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={activateCard}
            style={getBadgePosition(selection.rect)}
            type="button"
          >
            <img
              alt=""
              className="h-4 w-4"
              height={16}
              src={chrome.runtime.getURL("icons/icon-32.png")}
              width={16}
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
