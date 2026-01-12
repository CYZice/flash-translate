import { useEffect, useState } from "react";
import { calculateCardPosition } from "../hooks/card-position";
import { useDraggable } from "../hooks/use-draggable";
import { useResizable } from "../hooks/use-resizable";
import type { SelectionInfo } from "../hooks/use-text-selection";
import { useTranslator } from "../hooks/use-translator";
import { DragHandle } from "./drag-handle";
import { ResizeHandle } from "./resize-handle";
import { TranslationCardFooter } from "./translation-card-footer";
import { TranslationCardHeader } from "./translation-card-header";
import {
  calculateCardWidth,
  calculateMaxCardHeight,
  calculateMaxCardWidth,
  INITIAL_CARD_HEIGHT,
  MIN_CARD_HEIGHT,
  MIN_CARD_WIDTH,
} from "./translation-card-utils";
import { TranslationContent } from "./translation-content";

interface TranslationCardProps {
  selection: SelectionInfo;
  sourceLanguage: string;
  targetLanguage: string;
  autoDetectEnabled: boolean;
  detectedLanguage: string | null;
  isDetecting: boolean;
  onSourceLanguageOverride: (lang: string | null) => void;
  onClose: () => void;
  onExcludeSite: () => void;
}

export function TranslationCard({
  selection,
  sourceLanguage,
  targetLanguage,
  autoDetectEnabled,
  detectedLanguage,
  isDetecting,
  onSourceLanguageOverride,
  onClose,
  onExcludeSite,
}: TranslationCardProps) {
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

  const [maxCardWidth, setMaxCardWidth] = useState(() =>
    calculateMaxCardWidth(window.innerWidth)
  );
  const [maxCardHeight, setMaxCardHeight] = useState(() =>
    calculateMaxCardHeight(window.innerHeight)
  );

  // Calculate card width based on selection width (clamped to min/max)
  const selectionBasedWidth = calculateCardWidth(
    selection.rect.width,
    maxCardWidth
  );

  // Update max dimensions on window resize with debounce
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const handleResize = () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        setMaxCardWidth(calculateMaxCardWidth(window.innerWidth));
        setMaxCardHeight(calculateMaxCardHeight(window.innerHeight));
      }, 100);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const {
    width,
    height,
    offsetX: resizeOffsetX,
    handleLeftMouseDown,
    handleRightMouseDown,
    handleBottomMouseDown,
    handleLeftKeyDown,
    handleRightKeyDown,
    handleBottomKeyDown,
  } = useResizable({
    initialWidth: selectionBasedWidth,
    minWidth: MIN_CARD_WIDTH,
    maxWidth: maxCardWidth,
    initialHeight: INITIAL_CARD_HEIGHT,
    minHeight: MIN_CARD_HEIGHT,
    maxHeight: maxCardHeight,
  });

  const {
    offset,
    isDragging,
    handleMouseDown: handleDragMouseDown,
    handleKeyDown: handleDragKeyDown,
  } = useDraggable();

  const position = calculateCardPosition(
    selection.rect,
    { cardWidth: selectionBasedWidth, cardHeight: height, margin: 8 },
    { width: window.innerWidth, height: window.innerHeight }
  );

  const cardLeft = position.x + offset.x + resizeOffsetX;
  const rawCardTop = position.y + offset.y;

  // Adjust card position if it overflows bottom of viewport
  const viewportMargin = 8;
  const cardBottom = rawCardTop + height;
  const cardTop =
    cardBottom > window.innerHeight - viewportMargin
      ? Math.max(
          viewportMargin,
          rawCardTop - (cardBottom - (window.innerHeight - viewportMargin))
        )
      : rawCardTop;

  return (
    <div
      className="fixed font-sans text-gray-800 text-sm leading-normal transition-[left,top] duration-150 ease-out"
      style={{
        left: `${cardLeft}px`,
        top: `${cardTop}px`,
        zIndex: 2_147_483_647,
      }}
    >
      <div
        className="relative flex animate-card-expand flex-col overflow-hidden rounded-xl border border-stone-400/60 border-solid bg-white/90 pt-3 shadow-2xl backdrop-blur transition-[width,height] duration-150 ease-out"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          minWidth: `${MIN_CARD_WIDTH}px`,
          maxWidth: `${maxCardWidth}px`,
          minHeight: `${MIN_CARD_HEIGHT}px`,
          maxHeight: `${maxCardHeight}px`,
        }}
      >
        <DragHandle
          isDragging={isDragging}
          onKeyDown={handleDragKeyDown}
          onMouseDown={handleDragMouseDown}
        />
        <ResizeHandle
          onKeyDown={handleLeftKeyDown}
          onMouseDown={handleLeftMouseDown}
          side="left"
        />
        <ResizeHandle
          onKeyDown={handleRightKeyDown}
          onMouseDown={handleRightMouseDown}
          side="right"
        />
        <TranslationCardHeader
          autoDetectEnabled={autoDetectEnabled}
          detectedLanguage={detectedLanguage}
          isDetecting={isDetecting}
          onClose={onClose}
          onExcludeSite={onExcludeSite}
          onSourceLanguageOverride={onSourceLanguageOverride}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
        />

        <div className="min-h-10 flex-1 overflow-y-auto px-4 py-1">
          <TranslationContent
            availability={availability}
            error={error}
            isLoading={isLoading}
            result={result}
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
          />
        </div>

        <TranslationCardFooter result={result} />
        <ResizeHandle
          onKeyDown={handleBottomKeyDown}
          onMouseDown={handleBottomMouseDown}
          side="bottom"
        />
      </div>
    </div>
  );
}
