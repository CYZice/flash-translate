import { useEffect, useRef, useState } from "react";
import { useLatestRef } from "@/shared/hooks/use-latest-ref";

interface UseDraggableOptions {
  onDragEnd?: (offset: { x: number; y: number }) => void;
  resetKey?: unknown;
  /** Pixels to move per arrow key press (default: 10) */
  keyboardStep?: number;
}

interface UseDraggableReturn {
  offset: { x: number; y: number };
  isDragging: boolean;
  handlePointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  resetOffset: () => void;
}

export function useDraggable({
  onDragEnd,
  resetKey,
  keyboardStep = 10,
}: UseDraggableOptions = {}): UseDraggableReturn {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startMouseRef = useRef({ x: 0, y: 0 });
  const startOffsetRef = useRef({ x: 0, y: 0 });
  // Track current offset for mouseup handler without causing effect re-runs
  const currentOffsetRef = useLatestRef(offset);

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey is the explicit reset boundary for this hook
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, [resetKey]);

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const target = e.target as Element;
    if (
      target.closest(
        "button, select, input, textarea, a, [role='button'], [role='separator']"
      )
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    startMouseRef.current = { x: e.clientX, y: e.clientY };
    startOffsetRef.current = offset;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let deltaX = 0;
    let deltaY = 0;

    switch (e.key) {
      case "ArrowUp":
        deltaY = -keyboardStep;
        break;
      case "ArrowDown":
        deltaY = keyboardStep;
        break;
      case "ArrowLeft":
        deltaX = -keyboardStep;
        break;
      case "ArrowRight":
        deltaX = keyboardStep;
        break;
      case "Escape":
        resetOffset();
        onDragEnd?.({ x: 0, y: 0 });
        return;
      default:
        return;
    }

    e.preventDefault();
    const newOffset = { x: offset.x + deltaX, y: offset.y + deltaY };
    setOffset(newOffset);
    onDragEnd?.(newOffset);
  };

  const resetOffset = () => {
    setOffset({ x: 0, y: 0 });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: currentOffsetRef.current is intentionally excluded - useLatestRef ensures we always have the latest value without causing effect re-runs
  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - startMouseRef.current.x;
      const deltaY = e.clientY - startMouseRef.current.y;
      setOffset({
        x: startOffsetRef.current.x + deltaX,
        y: startOffsetRef.current.y + deltaY,
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      // Use ref to get latest offset without dependency
      onDragEnd?.(currentOffsetRef.current);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, onDragEnd]);

  return {
    offset,
    isDragging,
    handlePointerDown,
    handleKeyDown,
    resetOffset,
  };
}
