import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/button";
import { getMessage } from "@/shared/utils/i18n";
import { useCardLayout } from "../hooks/use-card-layout";
import type { SelectionInfo } from "../hooks/use-text-selection";
import { useTranslator } from "../hooks/use-translator";
import type { HoveredTermTranslationState } from "../term-translation/use-hovered-term-translation";
import { CardSettings } from "./card-settings";
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
  isAiConfigured: boolean;
  termTranslation: HoveredTermTranslationState;
  onSourceLanguageOverride: (lang: string | null) => void;
  onClose: () => void;
  onExcludeSite: () => Promise<void>;
}

export function TranslationCard({
  selection,
  sourceLanguage,
  targetLanguage,
  autoDetectEnabled,
  detectedLanguage,
  isDetecting,
  isAiConfigured,
  termTranslation,
  onSourceLanguageOverride,
  onClose,
  onExcludeSite,
}: TranslationCardProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeResultView, setActiveResultView] =
    useState<TranslationResultView>("local");
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const localTranslation = useTranslator({
    sourceLanguage,
    targetLanguage,
    provider: "chrome-built-in",
  });
  const aiTranslation = useTranslator({
    sourceLanguage,
    targetLanguage,
    provider: "custom-ai",
    resetKey: `${selection.text}\u0000${sourceLanguage}\u0000${targetLanguage}`,
  });

  // Translate when selection or language changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: translate is intentionally excluded to avoid infinite loops (it captures sourceLanguage/targetLanguage)
  useEffect(() => {
    if (selection.text && !isDetecting) {
      localTranslation.translate(selection.text);
    }
  }, [
    selection.text,
    selection.contextBefore,
    selection.contextAfter,
    sourceLanguage,
    targetLanguage,
    isDetecting,
  ]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: each new selection starts in the local result view.
  useEffect(() => {
    setActiveResultView("local");
  }, [selection.text]);

  const startAiTranslation = () => {
    setActiveResultView("ai");
    aiTranslation.translate(selection.text, {
      contextBefore: selection.contextBefore,
      contextAfter: selection.contextAfter,
    });
  };

  const handleResultViewChange = (view: TranslationResultView) => {
    setActiveResultView(view);
    if (
      view === "ai" &&
      !aiTranslation.result &&
      !aiTranslation.isLoading &&
      !aiTranslation.error
    ) {
      startAiTranslation();
    }
  };

  const currentTranslation =
    activeResultView === "ai" ? aiTranslation : localTranslation;
  const aiHasResponse = Boolean(
    aiTranslation.result || aiTranslation.isLoading || aiTranslation.error
  );

  const renderResultContent = () => {
    if (activeResultView === "local") {
      return (
        <TranslationContent
          availability={localTranslation.availability}
          error={localTranslation.error}
          isLoading={localTranslation.isLoading}
          result={localTranslation.result}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
        />
      );
    }

    if (!aiHasResponse) {
      return (
        <div className="flex min-h-28 flex-col items-start justify-center gap-3 text-gray-500">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="text-violet-600" size={18} />
            <span>{getMessage("content_aiEnhanceDescription")}</span>
          </div>
          <Button
            className="gap-1.5 border border-violet-200 bg-violet-50 px-2.5 text-violet-700 hover:bg-violet-100 hover:text-violet-800"
            onClick={startAiTranslation}
            variant="ghost"
          >
            <Sparkles size={14} />
            {getMessage("content_aiEnhance")}
          </Button>
        </div>
      );
    }

    return (
      <div>
        <TranslationContent
          availability={aiTranslation.availability}
          error={aiTranslation.error}
          isLoading={aiTranslation.isLoading}
          result={aiTranslation.result}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
        />
      </div>
    );
  };

  const layoutKey = `${selection.text}\u0000${selection.rect.left}:${selection.rect.top}:${selection.rect.width}:${selection.rect.height}`;
  const layout = useCardLayout({ layoutKey, selectionRect: selection.rect });

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
  }, [
    layout.height,
    layout.isResizing,
    layout.maxHeight,
    layout.setHeight,
  ]);

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
          aiIsLoading={aiTranslation.isLoading}
          autoDetectEnabled={autoDetectEnabled}
          detectedLanguage={detectedLanguage}
          isDetecting={isDetecting}
          isDragging={layout.isDragging}
          isSettingsOpen={isSettingsOpen}
          onClose={onClose}
          onMovePointerDown={layout.handleDragPointerDown}
          onResultViewChange={handleResultViewChange}
          onSettingsToggle={() => setIsSettingsOpen((isOpen) => !isOpen)}
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
            {isSettingsOpen ? (
              <CardSettings onExcludeSite={onExcludeSite} />
            ) : (
              <div className="relative px-4 py-3 pr-12">
                {renderResultContent()}
                <div className="absolute top-2 right-2">
                  <CopyButton text={currentTranslation.result} />
                </div>
              </div>
            )}
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
