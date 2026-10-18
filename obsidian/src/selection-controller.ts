import { setIcon } from "obsidian";
import { positionSelectionBadge } from "../../src/shared/selection/selection-geometry";
import { isTranslationUI, type SelectedSource } from "./workspace-selection";

const SELECTION_KEYS = /^(Arrow|Home$|End$|Shift$)/;

interface SelectionControllerOptions {
  read: () => SelectedSource | null;
  trigger: () => "badge" | "immediate" | "off";
  pinned: () => boolean;
  translate: (source: SelectedSource) => void;
  dismiss: () => void;
}

export class SelectionController {
  private readonly document: Document;
  private options: SelectionControllerOptions | null;
  private badge: HTMLButtonElement | null = null;
  private source: SelectedSource | null = null;
  private last: {
    text: string;
    left: number;
    top: number;
    start?: number;
  } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dragging = false;
  private readonly cleanups: (() => void)[] = [];

  constructor(document: Document, options: SelectionControllerOptions) {
    this.document = document;
    this.options = options;
    const listen = (
      target: EventTarget,
      type: string,
      action: EventListener
    ): void => {
      target.addEventListener(type, action, true);
      this.cleanups.push(() => target.removeEventListener(type, action, true));
    };
    listen(document, "mousedown", (event) => {
      if (isTranslationUI(event.target as Node)) {
        return;
      }
      this.dragging = true;
      this.cancelTimer();
      if (!this.options?.pinned()) {
        this.options?.dismiss();
      }
    });
    listen(document, "mouseup", (event) => {
      this.dragging = false;
      if (!isTranslationUI(event.target as Node)) {
        this.schedule();
      }
    });
    listen(document, "selectionchange", () => {
      if (!this.dragging) {
        this.schedule();
      }
    });
    listen(document, "keyup", (event) => {
      if (
        SELECTION_KEYS.test((event as KeyboardEvent).key) &&
        !isTranslationUI(event.target as Node)
      ) {
        this.schedule();
      }
    });
    listen(document, "keydown", (event) => {
      if ((event as KeyboardEvent).key === "Escape") {
        this.reset();
        this.options?.dismiss();
      }
    });
    listen(document, "scroll", (event) => {
      if (isTranslationUI(event.target as Node)) {
        return;
      }
      this.reset();
      if (!this.options?.pinned()) {
        this.options?.dismiss();
      }
    });
    const win = document.defaultView;
    if (win) {
      listen(win, "blur", (event) => {
        if (event.target === event.currentTarget) {
          this.reset();
          this.options?.dismiss();
        }
      });
      listen(win, "resize", () => this.reset());
    }
  }

  get pending(): SelectedSource | null {
    return this.source;
  }

  acknowledge(source: SelectedSource): void {
    this.clearPending();
    this.last = {
      text: source.text,
      left: source.rect.left,
      top: source.rect.top,
      start: source.note?.start,
    };
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedule(): void {
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.capture();
    }, 50);
  }

  private capture(): void {
    if (
      !this.options ||
      isTranslationUI(this.document.activeElement) ||
      this.document.activeElement?.closest(".prompt")
    ) {
      return;
    }
    const source = this.options.read();
    if (!source) {
      this.reset();
      return;
    }
    const last = this.last;
    if (
      last &&
      last.text === source.text &&
      last.left === source.rect.left &&
      last.top === source.rect.top &&
      last.start === source.note?.start
    ) {
      return;
    }
    this.clearPending();
    this.last = {
      text: source.text,
      left: source.rect.left,
      top: source.rect.top,
      start: source.note?.start,
    };
    this.source = source;
    const trigger = this.options.trigger();
    if (trigger === "off") {
      return;
    }
    if (trigger === "immediate" || this.options.pinned()) {
      this.activate();
      return;
    }
    const badge = this.document.createElement("button");
    badge.type = "button";
    badge.className = "flash-translate-badge";
    badge.dataset.flashTranslateUi = "badge";
    badge.title = "Translate selection";
    badge.setAttribute("aria-label", "Translate selection");
    setIcon(badge, "languages");
    badge.addEventListener("mousedown", (event) => event.preventDefault());
    badge.addEventListener("click", () => this.activate());
    this.document.body.append(badge);
    const win = this.document.defaultView;
    if (win) {
      const point = positionSelectionBadge(
        source.rect,
        badge.getBoundingClientRect(),
        { width: win.innerWidth, height: win.innerHeight }
      );
      badge.style.left = `${point.x}px`;
      badge.style.top = `${point.y}px`;
    }
    this.badge = badge;
  }

  private activate(): void {
    const source = this.source;
    this.clearPending();
    if (source) {
      this.options?.translate(source);
    }
  }

  private clearPending(): void {
    this.cancelTimer();
    this.badge?.remove();
    this.badge = null;
    this.source = null;
  }

  reset(): void {
    this.clearPending();
    this.last = null;
  }

  dispose(): void {
    this.reset();
    this.options = null;
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups.length = 0;
  }
}
