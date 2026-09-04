import type { RectLike } from "./types";

export class AnchorTracker {
  private cleanup: (() => void) | null = null;

  start(
    refresh: () => RectLike | null,
    onUpdate: (rect: RectLike | null) => void,
    editor?: EventTarget
  ): void {
    this.stop();
    const update = () => onUpdate(refresh());
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
