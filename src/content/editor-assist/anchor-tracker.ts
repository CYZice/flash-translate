import type { RectLike } from "./types";

export function areAnchorRectsEqual(
  current: RectLike | null,
  next: RectLike | null
): boolean {
  if (!(current && next)) {
    return current === next;
  }

  return (
    current.bottom === next.bottom &&
    current.height === next.height &&
    current.left === next.left &&
    current.right === next.right &&
    current.top === next.top &&
    current.width === next.width &&
    current.x === next.x &&
    current.y === next.y
  );
}

export class AnchorTracker {
  private cleanup: (() => void) | null = null;

  start(
    refresh: () => RectLike | null,
    onUpdate: (rect: RectLike | null) => void,
    editor?: EventTarget
  ): void {
    this.stop();
    let currentRect: RectLike | null = null;
    const update = () => {
      const nextRect = refresh();
      if (areAnchorRectsEqual(currentRect, nextRect)) {
        return;
      }
      currentRect = nextRect;
      onUpdate(nextRect);
    };
    const listeners: [EventTarget, string, EventListener, boolean?][] = [
      [window, "scroll", update, true],
      [window, "resize", update],
    ];
    if (editor) {
      listeners.push([editor, "scroll", update, true]);
    }
    if (window.visualViewport) {
      listeners.push(
        [window.visualViewport, "scroll", update],
        [window.visualViewport, "resize", update]
      );
    }
    for (const [target, type, listener, capture] of listeners) {
      target.addEventListener(type, listener, capture);
    }
    update();
    this.cleanup = () => {
      for (const [target, type, listener, capture] of listeners) {
        target.removeEventListener(type, listener, capture);
      }
    };
  }

  stop(): void {
    this.cleanup?.();
    this.cleanup = null;
  }
}
