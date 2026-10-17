import { useEffect, useRef, useState } from "react";
import {
  calculateCardWidth,
  calculateMaxCardHeight,
  calculateMaxCardWidth,
  INITIAL_CARD_HEIGHT,
  MIN_CARD_HEIGHT,
  MIN_CARD_WIDTH,
} from "../components/translation-card-utils";
import { calculateCardPosition, clampCardTop } from "./card-position";
import { useDraggable } from "./use-draggable";
import { useResizable } from "./use-resizable";

const RESIZE_DEBOUNCE_MS = 100;
const VIEWPORT_MARGIN = 8;

export interface CardLayoutConfig {
  selectionRect: DOMRect;
  layoutKey: string;
  isPinned?: boolean;
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
  isResizing: boolean;

  // Resize handlers
  handleLeftMouseDown: (e: React.MouseEvent) => void;
  handleRightMouseDown: (e: React.MouseEvent) => void;
  handleBottomMouseDown: (e: React.MouseEvent) => void;
  handleBottomLeftMouseDown: (e: React.MouseEvent) => void;
  handleBottomRightMouseDown: (e: React.MouseEvent) => void;
  handleLeftKeyDown: (e: React.KeyboardEvent) => void;
  handleRightKeyDown: (e: React.KeyboardEvent) => void;
  handleBottomKeyDown: (e: React.KeyboardEvent) => void;
  handleBottomLeftKeyDown: (e: React.KeyboardEvent) => void;
  handleBottomRightKeyDown: (e: React.KeyboardEvent) => void;
  setHeight: (height: number) => void;

  // Drag handlers
  handleDragPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
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
export function useCardLayout({
  selectionRect,
  layoutKey,
  isPinned = false,
}: CardLayoutConfig): CardLayout {
  const anchorRef = useRef({ rect: selectionRect, layoutKey });
  if (!isPinned) {
    anchorRef.current = { rect: selectionRect, layoutKey };
  }
  const [maxCardWidth, setMaxCardWidth] = useState(() =>
    calculateMaxCardWidth(window.visualViewport?.width ?? window.innerWidth)
  );
  const [maxCardHeight, setMaxCardHeight] = useState(() =>
    calculateMaxCardHeight(window.visualViewport?.height ?? window.innerHeight)
  );
  const [isHeightManuallySized, setIsHeightManuallySized] = useState(false);
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const initialWidth = calculateCardWidth(
    anchorRef.current.rect.width,
    maxCardWidth
  );
  const resetKey = anchorRef.current.layoutKey;

  // Update max dimensions on window resize with debounce
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const handleResize = () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        setMaxCardWidth(
          calculateMaxCardWidth(
            window.visualViewport?.width ?? window.innerWidth
          )
        );
        setMaxCardHeight(
          calculateMaxCardHeight(
            window.visualViewport?.height ?? window.innerHeight
          )
        );
      }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  const minWidth = Math.min(MIN_CARD_WIDTH, maxCardWidth);
  const minHeight = Math.min(MIN_CARD_HEIGHT, maxCardHeight);
  const preferredHeight = Math.min(INITIAL_CARD_HEIGHT, maxCardHeight);

  const {
    width,
    height,
    offsetX: resizeOffsetX,
    isResizing,
    handleLeftMouseDown,
    handleRightMouseDown,
    handleBottomMouseDown,
    handleBottomLeftMouseDown,
    handleBottomRightMouseDown,
    handleLeftKeyDown,
    handleRightKeyDown,
    handleBottomKeyDown,
    handleBottomLeftKeyDown,
    handleBottomRightKeyDown,
    setHeight,
  } = useResizable({
    initialWidth,
    resetKey,
    viewportWidth,
    viewportHeight,
    minWidth,
    maxWidth: maxCardWidth,
    initialHeight: preferredHeight,
    minHeight,
    maxHeight: maxCardHeight,
    onResizeStart: (axis) => {
      if (axis === "height") {
        setIsHeightManuallySized(true);
      }
    },
  });

  const {
    offset,
    isDragging,
    handlePointerDown: handleDragPointerDown,
    handleKeyDown: handleDragKeyDown,
  } = useDraggable({ resetKey });

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey is the explicit reset boundary for this card
  useEffect(() => {
    setIsHeightManuallySized(false);
  }, [resetKey]);

  const position = calculateCardPosition(
    anchorRef.current.rect,
    {
      cardWidth: width,
      cardHeight: height,
      margin: VIEWPORT_MARGIN,
    },
    { width: viewportWidth, height: viewportHeight }
  );
  const positionRef = useRef(position);
  if (!isPinned) {
    positionRef.current = position;
  }

  const cardLeft = Math.max(
    VIEWPORT_MARGIN,
    Math.min(
      Math.max(VIEWPORT_MARGIN, viewportWidth - VIEWPORT_MARGIN - width),
      positionRef.current.x + offset.x + resizeOffsetX
    )
  );
  const top = clampCardTop(
    positionRef.current.y + offset.y,
    height,
    viewportHeight,
    VIEWPORT_MARGIN
  );

  return {
    // Dimensions
    width,
    height,
    minWidth,
    maxWidth: maxCardWidth,
    minHeight,
    maxHeight: maxCardHeight,

    // Position
    left: cardLeft,
    top,

    // Drag state
    isDragging,
    isResizing,

    // Resize handlers
    handleLeftMouseDown,
    handleRightMouseDown,
    handleBottomMouseDown,
    handleBottomLeftMouseDown,
    handleBottomRightMouseDown,
    handleLeftKeyDown,
    handleRightKeyDown,
    handleBottomKeyDown,
    handleBottomLeftKeyDown,
    handleBottomRightKeyDown,
    setHeight: (nextHeight) => {
      if (!isHeightManuallySized) {
        setHeight(nextHeight);
      }
    },

    // Drag handlers
    handleDragPointerDown,
    handleDragKeyDown,
  };
}
