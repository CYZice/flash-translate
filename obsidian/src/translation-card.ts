import { setIcon } from "obsidian";
import { SUPPORTED_LANGUAGES } from "../../src/shared/constants/languages";
import {
  clampPosition,
  positionNearSelection,
  type SelectionRect,
} from "./floating-position";

const MOVE_KEYS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

export interface TranslationCardContent {
  text: string;
  model: string;
  sourceLanguage: string;
  targetLanguage: string;
  translate: (target: string, signal: AbortSignal) => Promise<string>;
  apply?: (translation: string, mode: "replace" | "insert") => void;
}

export class TranslationCard {
  readonly document: Document;
  private options: TranslationCardContent | null = null;
  private root: HTMLElement | null = null;
  private resultEl: HTMLTextAreaElement | null = null;
  private statusEl: HTMLElement | null = null;
  private actions: HTMLButtonElement[] = [];
  private retry: HTMLButtonElement | null = null;
  private controller: AbortController | null = null;
  private generation = 0;
  private target = "";
  private pinned = false;
  private drag: {
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null = null;
  private readonly onClose: () => void;

  constructor(document: Document, onClose: () => void) {
    this.document = document;
    this.onClose = onClose;
    document.defaultView?.addEventListener("resize", this.onResize);
  }

  get isPinned(): boolean {
    return this.pinned;
  }

  private readonly onResize = (): void => {
    if (this.root) {
      this.move(
        Number.parseFloat(this.root.style.left),
        Number.parseFloat(this.root.style.top)
      );
    }
  };

  private move(x: number, y: number): void {
    const root = this.root;
    const win = this.document.defaultView;
    if (!(root && win)) {
      return;
    }
    const point = clampPosition({ x, y }, root.getBoundingClientRect(), {
      width: win.innerWidth,
      height: win.innerHeight,
    });
    root.style.left = `${point.x}px`;
    root.style.top = `${point.y}px`;
  }

  private button(
    parent: HTMLElement,
    label: string,
    action: () => void,
    icon?: string
  ): HTMLButtonElement {
    const button = this.document.createElement("button");
    button.type = "button";
    button.title = label;
    button.setAttribute("aria-label", label);
    if (icon) {
      button.className = "flash-translate-icon";
      setIcon(button, icon);
    } else {
      button.textContent = label;
    }
    button.addEventListener("click", action);
    parent.append(button);
    return button;
  }

  update(content: TranslationCardContent, anchor: SelectionRect): void {
    const oldRoot = this.root;
    const position =
      oldRoot && this.pinned
        ? {
            left: oldRoot.style.left,
            top: oldRoot.style.top,
            width: oldRoot.style.width,
            height: oldRoot.style.height,
          }
        : null;
    this.generation++;
    this.controller?.abort();
    this.controller = null;
    this.options = content;
    this.target = oldRoot ? this.target : content.targetLanguage;
    this.actions = [];
    this.drag = null;
    const root = this.document.createElement("section");
    root.className = "flash-translate-card";
    root.dataset.flashTranslateUi = "card";
    root.setAttribute("aria-label", "Flash Translate");
    root.setAttribute("role", "region");
    this.root = root;
    const header = this.document.createElement("div");
    header.className = "flash-translate-header";
    header.tabIndex = 0;
    header.title = "Drag to move; arrow keys to reposition";
    root.append(header);
    const source = this.document.createElement("span");
    source.className = "flash-translate-language";
    source.textContent = `${content.sourceLanguage === "auto" ? "Auto" : content.sourceLanguage.toUpperCase()} →`;
    header.append(source);
    const target = this.document.createElement("select");
    target.setAttribute("aria-label", "Target language");
    for (const language of SUPPORTED_LANGUAGES) {
      const option = this.document.createElement("option");
      option.value = language.code;
      option.textContent = language.code.toUpperCase();
      option.title = language.name;
      target.append(option);
    }
    target.value = this.target;
    target.addEventListener("change", () => {
      this.target = target.value;
      this.runTranslation();
    });
    header.append(target);
    const spacer = this.document.createElement("span");
    spacer.className = "flash-translate-spacer";
    header.append(spacer);
    const pin = this.button(
      header,
      "Pin position",
      () => {
        this.pinned = !this.pinned;
        pin.setAttribute("aria-pressed", String(this.pinned));
      },
      "pin"
    );
    pin.setAttribute("aria-pressed", String(this.pinned));
    this.button(header, "Close translation", () => this.close(), "x");
    header.addEventListener("pointerdown", (event) => {
      if (
        event.button !== 0 ||
        (event.target as Element).closest("button,select")
      ) {
        return;
      }
      event.preventDefault();
      this.drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: Number.parseFloat(root.style.left),
        top: Number.parseFloat(root.style.top),
      };
      header.setPointerCapture(event.pointerId);
    });
    header.addEventListener("pointermove", (event) => {
      if (this.drag?.id === event.pointerId) {
        this.move(
          this.drag.left + event.clientX - this.drag.x,
          this.drag.top + event.clientY - this.drag.y
        );
      }
    });
    const endDrag = (): void => {
      this.drag = null;
    };
    header.addEventListener("pointerup", endDrag);
    header.addEventListener("pointercancel", endDrag);
    header.addEventListener("lostpointercapture", endDrag);
    header.addEventListener("keydown", (event) => {
      if (event.target !== header) {
        return;
      }
      const step = event.shiftKey ? 40 : 10;
      const direction = MOVE_KEYS[event.key];
      if (direction) {
        event.preventDefault();
        this.move(
          Number.parseFloat(root.style.left) + direction.x * step,
          Number.parseFloat(root.style.top) + direction.y * step
        );
      }
    });
    const result = this.document.createElement("textarea");
    result.className = "flash-translate-result";
    result.setAttribute("aria-label", "Translation");
    result.spellcheck = false;
    result.addEventListener("input", () =>
      this.setActionsEnabled(Boolean(result.value.trim()))
    );
    this.resultEl = result;
    root.append(result);
    const footer = this.document.createElement("div");
    footer.className = "flash-translate-footer";
    this.statusEl = this.document.createElement("span");
    this.statusEl.className = "flash-translate-status";
    this.statusEl.setAttribute("role", "status");
    this.statusEl.title = content.model;
    footer.append(this.statusEl);
    this.retry = this.button(footer, "Retry", () => this.runTranslation());
    const copy = this.button(
      footer,
      "Copy translation",
      () => this.copyTranslation(),
      "copy"
    );
    this.actions.push(copy);
    root.append(footer);
    if (content.apply) {
      const edits = this.document.createElement("div");
      edits.className = "flash-translate-edits";
      this.actions.push(
        this.button(edits, "Insert below", () => this.apply("insert"))
      );
      this.actions.push(
        this.button(edits, "Replace selection", () => this.apply("replace"))
      );
      root.append(edits);
    }
    if (oldRoot) {
      oldRoot.replaceWith(root);
    } else {
      this.document.body.append(root);
    }
    if (position) {
      Object.assign(root.style, position);
    } else {
      const win = this.document.defaultView;
      if (win) {
        const point = positionNearSelection(
          anchor,
          root.getBoundingClientRect(),
          { width: win.innerWidth, height: win.innerHeight }
        );
        this.move(point.x, point.y);
      }
    }
    this.runTranslation();
  }

  private setActionsEnabled(enabled: boolean): void {
    for (const action of this.actions) {
      action.disabled = !enabled;
    }
  }

  private async copyTranslation(): Promise<void> {
    const generation = this.generation;
    try {
      await this.document.defaultView?.navigator.clipboard.writeText(
        this.resultEl?.value ?? ""
      );
      if (generation === this.generation && this.statusEl) {
        this.statusEl.textContent = "Copied";
      }
    } catch {
      if (generation === this.generation) {
        this.showError("Select and copy the translation manually.");
      }
    }
  }

  private showError(message: string): void {
    if (this.statusEl) {
      this.statusEl.textContent = message;
      this.statusEl.classList.add("is-error");
    }
  }

  private async runTranslation(): Promise<void> {
    if (!this.options) {
      return;
    }
    const generation = ++this.generation;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.setActionsEnabled(false);
    if (this.resultEl) {
      this.resultEl.value = "";
      this.resultEl.disabled = true;
    }
    if (this.retry) {
      this.retry.hidden = true;
    }
    this.statusEl?.classList.remove("is-error");
    if (this.statusEl) {
      this.statusEl.textContent = "Translating…";
    }
    try {
      const result = await this.options.translate(
        this.target,
        controller.signal
      );
      if (generation !== this.generation) {
        return;
      }
      if (this.resultEl) {
        this.resultEl.value = result;
        this.resultEl.disabled = false;
      }
      this.setActionsEnabled(Boolean(result.trim()));
      if (this.statusEl) {
        this.statusEl.textContent = "";
      }
    } catch (error) {
      if (generation !== this.generation) {
        return;
      }
      this.showError(
        error instanceof Error ? error.message : "Translation failed."
      );
      if (this.retry) {
        this.retry.hidden = false;
      }
    } finally {
      if (this.controller === controller) {
        this.controller = null;
      }
    }
  }

  private apply(mode: "replace" | "insert"): void {
    try {
      this.options?.apply?.(this.resultEl?.value ?? "", mode);
      this.close();
    } catch (error) {
      this.showError(
        error instanceof Error
          ? error.message
          : "Could not insert the translation."
      );
    }
  }

  close(): void {
    if (!(this.root || this.options)) {
      return;
    }
    this.generation++;
    this.controller?.abort();
    this.controller = null;
    if (this.resultEl) {
      this.resultEl.value = "";
    }
    this.root?.remove();
    this.root = null;
    this.options = null;
    this.resultEl = null;
    this.statusEl = null;
    this.retry = null;
    this.actions = [];
    this.drag = null;
    this.target = "";
    this.document.defaultView?.removeEventListener("resize", this.onResize);
    this.onClose();
  }
}
