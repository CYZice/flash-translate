import { useEffect, useState } from "react";
import { calculatePopupPosition } from "../hooks/popup-position";
import { useDraggable } from "../hooks/use-draggable";
import { useResizable } from "../hooks/use-resizable";
import type { SelectionInfo } from "../hooks/use-text-selection";
import { useTranslator } from "../hooks/use-translator";
import { DragHandle } from "./drag-handle";
import { ResizeHandle } from "./resize-handle";
import { TranslationCardFooter } from "./translation-card-footer";
import { TranslationCardHeader } from "./translation-card-header";
import {
  calculateMaxPopupWidth,
  calculatePopupWidth,
  MIN_POPUP_WIDTH,
} from "./translation-card-utils";
import { TranslationContent } from "./translation-content";

interface TranslationCardProps {
  selection: SelectionInfo;
  sourceLanguage: string;
  targetLanguage: string;
  onClose: () => void;
  onExcludeSite: () => void;
}

export function TranslationCard({
  selection,
  sourceLanguage,
  targetLanguage,
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
    if (selection.text) {
      translate(selection.text);
    }
  }, [selection.text, sourceLanguage, targetLanguage]);

  const [maxPopupWidth, setMaxPopupWidth] = useState(() =>
    calculateMaxPopupWidth(window.innerWidth)
  );

  // Calculate popup width based on selection width (clamped to min/max)
  const selectionBasedWidth = calculatePopupWidth(
    selection.rect.width,
    maxPopupWidth
  );

  // Update max width on window resize with debounce
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const handleResize = () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        setMaxPopupWidth(calculateMaxPopupWidth(window.innerWidth));
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
    isResizing,
    offsetX: resizeOffsetX,
    handleLeftMouseDown,
    handleRightMouseDown,
    handleLeftKeyDown,
    handleRightKeyDown,
  } = useResizable({
    initialWidth: selectionBasedWidth,
    minWidth: MIN_POPUP_WIDTH,
    maxWidth: maxPopupWidth,
  });

  const {
    offset,
    isDragging,
    handleMouseDown: handleDragMouseDown,
    handleKeyDown: handleDragKeyDown,
  } = useDraggable();

  const position = calculatePopupPosition(
    selection.rect,
    { popupWidth: selectionBasedWidth, popupHeight: 180, margin: 8 },
    { width: window.innerWidth, height: window.innerHeight }
  );

  const headerHeight = 40;
  const contentPadding = 24;
  const maxContentHeight = Math.max(
    position.maxHeight - headerHeight - contentPadding,
    64
  );
  const cardLeft = position.x + offset.x + resizeOffsetX;
  const cardTop = position.y + offset.y;

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
        className="relative animate-popup-expand overflow-visible rounded-xl border border-stone-400/60 border-solid bg-white/90 pt-4 shadow-2xl backdrop-blur transition-[width] duration-150 ease-out"
        style={{
          width: `${width}px`,
          minWidth: `${MIN_POPUP_WIDTH}px`,
          maxWidth: `${maxPopupWidth}px`,
        }}
      >
        <DragHandle
          isDragging={isDragging}
          onKeyDown={handleDragKeyDown}
          onMouseDown={handleDragMouseDown}
        />
        <ResizeHandle
          isResizing={isResizing}
          onKeyDown={handleLeftKeyDown}
          onMouseDown={handleLeftMouseDown}
          side="left"
        />
        <ResizeHandle
          isResizing={isResizing}
          onKeyDown={handleRightKeyDown}
          onMouseDown={handleRightMouseDown}
          side="right"
        />
        <TranslationCardHeader
          onClose={onClose}
          onExcludeSite={onExcludeSite}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
        />

        <div
          className="min-h-16 px-4 py-3"
          style={{
            maxHeight: `${maxContentHeight}px`,
            overflowY: "auto",
          }}
        >
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
      </div>
    </div>
  );
}
