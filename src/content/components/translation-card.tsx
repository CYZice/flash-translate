import { useEffect, useRef, useState } from "react";
import { useCardLayout } from "../hooks/use-card-layout";
import type { SelectionInfo } from "../hooks/use-text-selection";
import { useTranslator } from "../hooks/use-translator";
import type { HoveredTermTranslationState } from "../term-translation/use-hovered-term-translation";
import { CopyButton } from "./copy-button";
import { ResizeHandle } from "./resize-handle";
import { TranslationCardHeader } from "./translation-card-header";
import {
  calculateAutoGrowHeight,
  calculateAutoGrowLimit,
  INITIAL_CARD_HEIGHT,
} from "./translation-card-utils";
import { TranslationContent } from "./translation-content";
import type { TranslationResultView } from "./translation-result-switch";

interface TranslationCardProps {
  selection: SelectionInfo;
  sourceLanguage: string;
  targetLanguage: string;
  autoDetectEnabled: boolean;
  detectedLanguage: string | null;
  isDetecting: boolean;
  isPinned: boolean;
  onPinToggle: () => void;
  isAiConfigured: boolean;
  defaultTranslationProvider: "chrome-built-in" | "custom-ai";
  termTranslation: HoveredTermTranslationState;
  onSourceLanguageOverride: (lang: string | null) => void;
  onClose: () => void;
}

export function TranslationCard({
  selection,
  sourceLanguage,
  targetLanguage,
  autoDetectEnabled,
  detectedLanguage,
  isDetecting,
  isPinned,
  onPinToggle,
  isAiConfigured,
  termTranslation,
  onSourceLanguageOverride,
  onClose,
  defaultTranslationProvider,
}: TranslationCardProps) {
  const viewResetKey = `${selection.text}\u0000${defaultTranslationProvider}\u0000${isAiConfigured}`;
  const [resultView, setResultView] = useState<{
    key: string;
    view: TranslationResultView;
  } | null>(null);
  const defaultView =
    defaultTranslationProvider === "custom-ai" && isAiConfigured
      ? "ai"
      : "local";
  const activeResultView =
    resultView?.key === viewResetKey ? resultView.view : defaultView;
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const currentTranslation = useTranslator({
    sourceLanguage,
    targetLanguage,
    provider: activeResultView === "ai" ? "custom-ai" : "chrome-built-in",
    resetKey: `${selection.text}\u0000${activeResultView}\u0000${sourceLanguage}\u0000${targetLanguage}`,
  });

  useEffect(() => {
    if (selection.text && !isDetecting) {
      currentTranslation.translate(
        selection.text,
        activeResultView === "ai" ? selection.readContext() : undefined
      );
    }
  }, [selection, activeResultView, isDetecting, currentTranslation.translate]);

  const handleResultViewChange = (view: TranslationResultView) => {
    setResultView({ key: viewResetKey, view });
  };

  const layoutKey = `${selection.text}\u0000${selection.rect.left}:${selection.rect.top}:${selection.rect.width}:${selection.rect.height}`;
  const layout = useCardLayout({
    layoutKey,
    selectionRect: selection.rect,
    isPinned,
  });

  // Measure natural content height so switching views can both grow and shrink the card.
  useEffect(() => {
    const body = bodyRef.current;
    const content = contentRef.current;
    if (!(body && content) || layout.isResizing) {
      return;
    }

    const measure = () => {
      const autoGrowLimit = calculateAutoGrowLimit(
        window.innerHeight,
        layout.maxHeight
      );
      const nextHeight = calculateAutoGrowHeight(
        layout.height,
        body.clientHeight,
        content.scrollHeight,
        INITIAL_CARD_HEIGHT,
        autoGrowLimit
      );
      if (Math.abs(nextHeight - layout.height) > 1) {
        layout.setHeight(nextHeight);
      }
    };

    let frameId = requestAnimationFrame(measure);
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(measure);
    });
    observer.observe(content);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [layout.height, layout.isResizing, layout.maxHeight, layout.setHeight]);

  return (
    <div
      className={`fixed font-sans text-gray-800 text-sm leading-normal ${layout.isDragging || layout.isResizing ? "" : "transition-[left,top] duration-150 ease-out"}`}
      style={{
        left: `${layout.left}px`,
        top: `${layout.top}px`,
        zIndex: 2_147_483_647,
      }}
    >
      <div
        className={`relative flex animate-card-expand flex-col overflow-hidden rounded-lg border border-gray-200 border-solid bg-white shadow-[0_12px_32px_rgba(15,23,42,0.16)] ${layout.isResizing ? "" : "transition-[width] duration-150 ease-out"}`}
        style={{
          width: `${layout.width}px`,
          height: `${layout.height}px`,
          minWidth: `${layout.minWidth}px`,
          maxWidth: `${layout.maxWidth}px`,
          minHeight: `${layout.minHeight}px`,
          maxHeight: `${layout.maxHeight}px`,
        }}
      >
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
        <TranslationCardHeader
          activeResultView={activeResultView}
          aiAvailable={isAiConfigured}
          aiIsLoading={
            activeResultView === "ai" && currentTranslation.isLoading
          }
          autoDetectEnabled={autoDetectEnabled}
          detectedLanguage={detectedLanguage}
          isDetecting={isDetecting}
          isDragging={layout.isDragging}
          onClose={onClose}
          isPinned={isPinned}
          onPinToggle={onPinToggle}
          onMovePointerDown={layout.handleDragPointerDown}
          onResultViewChange={handleResultViewChange}
          onSourceLanguageOverride={onSourceLanguageOverride}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          termTranslation={termTranslation}
        />
        <div
          className="translation-card-scroll min-h-0 flex-1 overflow-y-auto"
          id="translation-card-body"
          ref={bodyRef}
        >
          <div className="min-w-0 break-words" ref={contentRef}>
            <div className="relative px-4 py-3 pr-12">
              <TranslationContent
                availability={currentTranslation.availability}
                error={currentTranslation.error}
                isLoading={isDetecting || currentTranslation.isLoading}
                result={currentTranslation.result}
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
              />
              <div className="absolute top-2 right-2">
                <CopyButton text={currentTranslation.result} />
              </div>
            </div>
          </div>
        </div>
        <ResizeHandle
          onKeyDown={layout.handleBottomKeyDown}
          onMouseDown={layout.handleBottomMouseDown}
          side="bottom"
        />
        <ResizeHandle
          onKeyDown={layout.handleBottomLeftKeyDown}
          onMouseDown={layout.handleBottomLeftMouseDown}
          side="bottom-left"
        />
        <ResizeHandle
          onKeyDown={layout.handleBottomRightKeyDown}
          onMouseDown={layout.handleBottomRightMouseDown}
          side="bottom-right"
        />
      </div>
    </div>
  );
}
