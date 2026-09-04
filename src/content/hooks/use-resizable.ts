import { useCallback, useEffect, useRef, useState } from "react";
import { useLatestRef } from "@/shared/hooks/use-latest-ref";
import {
  calculateBottomResize,
  calculateLeftResize,
  calculateRightResize,
} from "./resizable";

interface UseResizableOptions {
  initialWidth: number;
  resetKey?: unknown;
  viewportWidth?: number;
  viewportHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  edgeMargin?: number;
  onResizeEnd?: (width: number, height: number) => void;
  onResizeStart?: (axis: "width" | "height") => void;
  /** Pixels to resize per arrow key press (default: 10) */
  keyboardStep?: number;
}

interface UseResizableReturn {
  width: number;
  height: number;
  isResizing: boolean;
  offsetX: number;
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
}

export function useResizable({
  initialWidth,
  resetKey,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
  minWidth = 280,
  maxWidth = 600,
  initialHeight = 180,
  minHeight = 120,
  maxHeight = 600,
  edgeMargin = 8,
  onResizeEnd,
  onResizeStart,
  keyboardStep = 10,
}: UseResizableOptions): UseResizableReturn {
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [offsetX, setOffsetX] = useState(0);
  const [isResizing, setIsResizing] = useState(false);

  // Refs to store values at drag start
  const dragStartRef = useRef({
    mouseX: 0,
    mouseY: 0,
    width: 0,
    height: 0,
    offsetX: 0,
    side: "right" as
      | "left"
      | "right"
      | "bottom"
      | "bottom-left"
      | "bottom-right",
    cardLeft: 0,
    cardRight: 0,
    cardBottom: 0,
  });
  // Track current dimensions for mouseup handler without causing effect re-runs
  const currentWidthRef = useLatestRef(width);
  const currentHeightRef = useLatestRef(height);

  // Reset dimensions only when a new card/selection is shown.
  // Viewport changes must clamp rather than reset a card being edited.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey defines the lifecycle boundary for this reset
  useEffect(() => {
    setWidth(initialWidth);
    setHeight(initialHeight);
    setOffsetX(0);
    setIsResizing(false);
  }, [resetKey]);

  // Clamp width when maxWidth changes (e.g., window resize)
  useEffect(() => {
    setWidth((prev) => Math.min(prev, maxWidth));
  }, [maxWidth]);

  // Clamp height when maxHeight changes (e.g., window resize)
  useEffect(() => {
    setHeight((prev) => Math.min(prev, maxHeight));
  }, [maxHeight]);

  const getCardRect = (e: React.MouseEvent) => {
    // Navigate up to find the card container (the one with position: fixed)
    let element = e.currentTarget.parentElement;
    while (element && getComputedStyle(element).position !== "fixed") {
      element = element.parentElement;
    }
    if (element) {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, bottom: rect.bottom };
    }
    return { left: 0, right: window.innerWidth, bottom: window.innerHeight };
  };

  const createMouseDownHandler =
    (side: "left" | "right" | "bottom" | "bottom-left" | "bottom-right") =>
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onResizeStart?.(side === "left" || side === "right" ? "width" : "height");
      const cardRect = getCardRect(e);
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        width,
        height,
        offsetX,
        side,
        cardLeft: cardRect.left,
        cardRight: cardRect.right,
        cardBottom: cardRect.bottom,
      };
      setIsResizing(true);
    };

  const handleLeftMouseDown = createMouseDownHandler("left");
  const handleRightMouseDown = createMouseDownHandler("right");
  const handleBottomMouseDown = createMouseDownHandler("bottom");
  const handleBottomLeftMouseDown = createMouseDownHandler("bottom-left");
  const handleBottomRightMouseDown = createMouseDownHandler("bottom-right");

  const handleLeftKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setWidth(initialWidth);
      setOffsetX(0);
      onResizeEnd?.(initialWidth, height);
      return;
    }

    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
      return;
    }

    e.preventDefault();
    onResizeStart?.("width");
    // Left handle: ArrowLeft expands (decreases offset, increases width)
    const delta = e.key === "ArrowLeft" ? keyboardStep : -keyboardStep;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, width + delta));
    const widthChange = newWidth - width;
    const newOffsetX = offsetX - widthChange;

    setWidth(newWidth);
    setOffsetX(newOffsetX);
    onResizeEnd?.(newWidth, height);
  };

  const handleRightKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setWidth(initialWidth);
      onResizeEnd?.(initialWidth, height);
      return;
    }

    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
      return;
    }

    e.preventDefault();
    onResizeStart?.("width");
    // Right handle: ArrowRight expands
    const delta = e.key === "ArrowRight" ? keyboardStep : -keyboardStep;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, width + delta));

    setWidth(newWidth);
    onResizeEnd?.(newWidth, height);
  };

  const handleBottomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setHeight(initialHeight);
      onResizeEnd?.(width, initialHeight);
      return;
    }

    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") {
      return;
    }

    e.preventDefault();
    onResizeStart?.("height");
    // Bottom handle: ArrowDown expands (increases height)
    const delta = e.key === "ArrowDown" ? keyboardStep : -keyboardStep;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, height + delta));

    setHeight(newHeight);
    onResizeEnd?.(width, newHeight);
  };

  const createCornerKeyDownHandler =
    (horizontalSide: "left" | "right") => (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setWidth(initialWidth);
        setHeight(initialHeight);
        if (horizontalSide === "left") {
          setOffsetX(0);
        }
        onResizeEnd?.(initialWidth, initialHeight);
        return;
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        handleBottomKeyDown(e);
        return;
      }

      if (horizontalSide === "left") {
        handleLeftKeyDown(e);
      } else {
        handleRightKeyDown(e);
      }
    };

  const handleBottomLeftKeyDown = createCornerKeyDownHandler("left");
  const handleBottomRightKeyDown = createCornerKeyDownHandler("right");

  const setCardHeight = useCallback(
    (nextHeight: number) => {
      setHeight(Math.max(minHeight, Math.min(maxHeight, nextHeight)));
    },
    [maxHeight, minHeight]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: currentWidthRef.current and currentHeightRef.current are intentionally excluded - useLatestRef ensures we always have the latest value without causing effect re-runs
  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const {
        mouseX,
        mouseY,
        width: startWidth,
        height: startHeight,
        offsetX: startOffsetX,
        side,
        cardLeft,
        cardRight,
        cardBottom,
      } = dragStartRef.current;

      if (side === "left" || side === "bottom-left") {
        const deltaX = e.clientX - mouseX;
        const constraints = { minWidth, maxWidth, edgeMargin };
        const { newWidth, newOffsetX } = calculateLeftResize({
          deltaX,
          startWidth,
          startOffsetX,
          cardLeft,
          constraints,
        });
        setWidth(newWidth);
        setOffsetX(newOffsetX);
      } else if (side === "right" || side === "bottom-right") {
        const deltaX = e.clientX - mouseX;
        const constraints = { minWidth, maxWidth, edgeMargin };
        const { newWidth } = calculateRightResize({
          deltaX,
          startWidth,
          cardRight,
          viewportWidth,
          constraints,
        });
        setWidth(newWidth);
      }

      if (
        side === "bottom" ||
        side === "bottom-left" ||
        side === "bottom-right"
      ) {
        const deltaY = e.clientY - mouseY;
        const constraints = { minHeight, maxHeight, edgeMargin };
        const { newHeight } = calculateBottomResize({
          deltaY,
          startHeight,
          cardBottom,
          viewportHeight,
          constraints,
        });
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Use refs to get latest dimensions without dependency
      onResizeEnd?.(currentWidthRef.current, currentHeightRef.current);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isResizing,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    edgeMargin,
    onResizeEnd,
    viewportHeight,
    viewportWidth,
  ]);

  return {
    width,
    height,
    isResizing,
    offsetX,
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
    setHeight: setCardHeight,
  };
}
