import { useEffect, useState } from "react";
import {
  calculateCardWidth,
  calculateMaxCardHeight,
  calculateMaxCardWidth,
  INITIAL_CARD_HEIGHT,
  MIN_CARD_HEIGHT,
  MIN_CARD_WIDTH,
} from "../components/translation-card-utils";
import { calculateCardPosition } from "./card-position";
import { useDraggable } from "./use-draggable";
import { useResizable } from "./use-resizable";

const RESIZE_DEBOUNCE_MS = 100;
const VIEWPORT_MARGIN = 8;

export interface CardLayoutConfig {
  selectionRect: DOMRect;
}

export interface CardLayout {
  // Dimensions
  width: number;
  height: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;

  // Position
  left: number;
  top: number;

  // Drag state
  isDragging: boolean;

  // Resize handlers
  handleLeftMouseDown: (e: React.MouseEvent) => void;
  handleRightMouseDown: (e: React.MouseEvent) => void;
  handleBottomMouseDown: (e: React.MouseEvent) => void;
  handleLeftKeyDown: (e: React.KeyboardEvent) => void;
  handleRightKeyDown: (e: React.KeyboardEvent) => void;
  handleBottomKeyDown: (e: React.KeyboardEvent) => void;

  // Drag handlers
  handleDragMouseDown: (e: React.MouseEvent) => void;
  handleDragKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * Hook that manages card layout including position, dimensions, and resize/drag state.
 *
 * Combines:
 * - Window resize detection (debounced)
 * - useResizable for width/height management
 * - useDraggable for position offset
 * - Position calculation with viewport overflow handling
 */
export function useCardLayout({ selectionRect }: CardLayoutConfig): CardLayout {
  const [maxCardWidth, setMaxCardWidth] = useState(() =>
    calculateMaxCardWidth(window.innerWidth)
  );
  const [maxCardHeight, setMaxCardHeight] = useState(() =>
    calculateMaxCardHeight(window.innerHeight)
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
      }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Calculate card width based on selection width (clamped to min/max)
  const selectionBasedWidth = calculateCardWidth(
    selectionRect.width,
    maxCardWidth
  );

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
    selectionRect,
    {
      cardWidth: selectionBasedWidth,
      cardHeight: height,
      margin: VIEWPORT_MARGIN,
    },
    { width: window.innerWidth, height: window.innerHeight }
  );

  const cardLeft = position.x + offset.x + resizeOffsetX;
  const rawCardTop = position.y + offset.y;

  // Adjust card position if it overflows bottom of viewport
  const cardBottom = rawCardTop + height;
  const top =
    cardBottom > window.innerHeight - VIEWPORT_MARGIN
      ? Math.max(
          VIEWPORT_MARGIN,
          rawCardTop - (cardBottom - (window.innerHeight - VIEWPORT_MARGIN))
        )
      : rawCardTop;

  return {
    // Dimensions
    width,
    height,
    minWidth: MIN_CARD_WIDTH,
    maxWidth: maxCardWidth,
    minHeight: MIN_CARD_HEIGHT,
    maxHeight: maxCardHeight,

    // Position
    left: cardLeft,
    top,

    // Drag state
    isDragging,

    // Resize handlers
    handleLeftMouseDown,
    handleRightMouseDown,
    handleBottomMouseDown,
    handleLeftKeyDown,
    handleRightKeyDown,
    handleBottomKeyDown,

    // Drag handlers
    handleDragMouseDown,
    handleDragKeyDown,
  };
}
