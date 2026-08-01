import { useEffect, useState } from "react";
import { useCardLayout } from "../hooks/use-card-layout";
import type { SelectionInfo } from "../hooks/use-text-selection";
import { useTranslator } from "../hooks/use-translator";
import type { HoveredTermTranslationState } from "../term-translation/use-hovered-term-translation";
import { CardSettings } from "./card-settings";
import { DragHandle } from "./drag-handle";
import { ResizeHandle } from "./resize-handle";
import { TranslationCardFooter } from "./translation-card-footer";
import { TranslationCardHeader } from "./translation-card-header";
import { TranslationContent } from "./translation-content";

interface TranslationCardProps {
  selection: SelectionInfo;
  sourceLanguage: string;
  targetLanguage: string;
  autoDetectEnabled: boolean;
  detectedLanguage: string | null;
  isDetecting: boolean;
  termTranslation: HoveredTermTranslationState;
  onSourceLanguageOverride: (lang: string | null) => void;
  onClose: () => void;
  onDisablePage: () => void;
  onExcludeSite: () => Promise<void>;
}

export function TranslationCard({
  selection,
  sourceLanguage,
  targetLanguage,
  autoDetectEnabled,
  detectedLanguage,
  isDetecting,
  termTranslation,
  onSourceLanguageOverride,
  onClose,
  onDisablePage,
  onExcludeSite,
}: TranslationCardProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { result, isLoading, error, translate, availability } = useTranslator({
    sourceLanguage,
    targetLanguage,
  });

  // Translate when selection or language changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: translate is intentionally excluded to avoid infinite loops (it captures sourceLanguage/targetLanguage)
  useEffect(() => {
    if (selection.text && !isDetecting) {
      translate(selection.text);
    }
  }, [selection.text, sourceLanguage, targetLanguage, isDetecting]);

  const layout = useCardLayout({ selectionRect: selection.rect });

  return (
    <div
      className="fixed font-sans text-gray-800 text-sm leading-normal transition-[left,top] duration-150 ease-out"
      style={{
        left: `${layout.left}px`,
        top: `${layout.top}px`,
        zIndex: 2_147_483_647,
      }}
    >
      <div
        className="relative flex animate-card-expand flex-col overflow-hidden rounded-xl border border-stone-400/60 border-solid bg-white/75 pt-3 shadow-2xl backdrop-blur-md transition-[width,height] duration-150 ease-out"
        style={{
          width: `${layout.width}px`,
          height: `${layout.height}px`,
          minWidth: `${layout.minWidth}px`,
          maxWidth: `${layout.maxWidth}px`,
          minHeight: `${layout.minHeight}px`,
          maxHeight: `${layout.maxHeight}px`,
        }}
      >
        <DragHandle
          isDragging={layout.isDragging}
          onKeyDown={layout.handleDragKeyDown}
          onMouseDown={layout.handleDragMouseDown}
        />
        <ResizeHandle
          onKeyDown={layout.handleLeftKeyDown}
          onMouseDown={layout.handleLeftMouseDown}
          side="left"
        />
        <ResizeHandle
          onKeyDown={layout.handleRightKeyDown}
          onMouseDown={layout.handleRightMouseDown}
          side="right"
        />
        <div
          className="min-h-10 flex-1 overflow-y-auto"
          id="translation-card-body"
        >
          <TranslationCardHeader
            autoDetectEnabled={autoDetectEnabled}
            detectedLanguage={detectedLanguage}
            isDetecting={isDetecting}
            isSettingsOpen={isSettingsOpen}
            onClose={onClose}
            onDisablePage={onDisablePage}
            onSettingsToggle={() => setIsSettingsOpen((isOpen) => !isOpen)}
            onSourceLanguageOverride={onSourceLanguageOverride}
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            termTranslation={termTranslation}
          />
          {isSettingsOpen ? (
            <CardSettings onExcludeSite={onExcludeSite} />
          ) : (
            <div className="px-4 py-1">
              <TranslationContent
                availability={availability}
                error={error}
                isLoading={isLoading}
                result={result}
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
              />
            </div>
          )}
        </div>

        {!isSettingsOpen && <TranslationCardFooter result={result} />}
        <ResizeHandle
          onKeyDown={layout.handleBottomKeyDown}
          onMouseDown={layout.handleBottomMouseDown}
          side="bottom"
        />
      </div>
    </div>
  );
}
