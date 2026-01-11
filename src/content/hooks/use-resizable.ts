import { useEffect, useRef, useState } from "react";
import { useLatestRef } from "@/shared/hooks/use-latest-ref";
import {
  calculateBottomResize,
  calculateLeftResize,
  calculateRightResize,
} from "./resizable";

interface UseResizableOptions {
  initialWidth: number;
  minWidth?: number;
  maxWidth?: number;
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  edgeMargin?: number;
  onResizeEnd?: (width: number, height: number) => void;
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
  handleLeftKeyDown: (e: React.KeyboardEvent) => void;
  handleRightKeyDown: (e: React.KeyboardEvent) => void;
  handleBottomKeyDown: (e: React.KeyboardEvent) => void;
}

export function useResizable({
  initialWidth,
  minWidth = 280,
  maxWidth = 600,
  initialHeight = 180,
  minHeight = 120,
  maxHeight = 600,
  edgeMargin = 8,
  onResizeEnd,
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
    side: "right" as "left" | "right" | "bottom",
    cardLeft: 0,
    cardRight: 0,
    cardBottom: 0,
  });
  // Track current dimensions for mouseup handler without causing effect re-runs
  const currentWidthRef = useLatestRef(width);
  const currentHeightRef = useLatestRef(height);

  // Update width when initialWidth changes (e.g., from settings)
  useEffect(() => {
    setWidth(initialWidth);
  }, [initialWidth]);

  // Update height when initialHeight changes
  useEffect(() => {
    setHeight(initialHeight);
  }, [initialHeight]);

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
    (side: "left" | "right" | "bottom") => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
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
    // Bottom handle: ArrowDown expands (increases height)
    const delta = e.key === "ArrowDown" ? keyboardStep : -keyboardStep;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, height + delta));

    setHeight(newHeight);
    onResizeEnd?.(width, newHeight);
  };

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

      if (side === "left") {
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
      } else if (side === "right") {
        const deltaX = e.clientX - mouseX;
        const constraints = { minWidth, maxWidth, edgeMargin };
        const { newWidth } = calculateRightResize({
          deltaX,
          startWidth,
          cardRight,
          viewportWidth: window.innerWidth,
          constraints,
        });
        setWidth(newWidth);
      } else {
        // bottom
        const deltaY = e.clientY - mouseY;
        const constraints = { minHeight, maxHeight, edgeMargin };
        const { newHeight } = calculateBottomResize({
          deltaY,
          startHeight,
          cardBottom,
          viewportHeight: window.innerHeight,
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
  ]);

  return {
    width,
    height,
    isResizing,
    offsetX,
    handleLeftMouseDown,
    handleRightMouseDown,
    handleBottomMouseDown,
    handleLeftKeyDown,
    handleRightKeyDown,
    handleBottomKeyDown,
  };
}
