import { type App, ButtonComponent, DropdownComponent, Modal } from "obsidian";
import { SUPPORTED_LANGUAGES } from "../../src/shared/constants/languages";
import type { NoteSelection } from "./selection";

interface TranslationPreviewOptions {
  model: string;
  targetLanguage: string;
  translate: (target: string) => Promise<string>;
  apply: (translation: string, mode: "replace" | "insert") => void;
  onClose: () => void;
}

export class TranslationPreview extends Modal {
  private readonly snapshot: NoteSelection;
  private readonly options: TranslationPreviewOptions;
  private generation = 0;
  private resultEl: HTMLTextAreaElement | null = null;
  private statusEl: HTMLElement | null = null;
  private actions: ButtonComponent[] = [];
  private retry: ButtonComponent | null = null;
  private target: string;

  constructor(
    app: App,
    snapshot: NoteSelection,
    options: TranslationPreviewOptions
  ) {
    super(app);
    this.snapshot = snapshot;
    this.options = options;
    this.target = options.targetLanguage;
  }

  onOpen(): void {
    this.modalEl.addClass("flash-translate-modal");
    this.setTitle("Flash Translate");
    const toolbar = this.contentEl.createDiv({
      cls: "flash-translate-toolbar",
    });
    toolbar.createSpan({
      text: this.options.model,
      cls: "flash-translate-model",
    });
    const label = toolbar.createEl("label", {
      text: "Translate to ",
      cls: "flash-translate-target",
    });
    const target = new DropdownComponent(label);
    target.selectEl.setAttribute("aria-label", "Target language");
    for (const language of SUPPORTED_LANGUAGES) {
      target.addOption(language.code, language.name);
    }
    target.setValue(this.target).onChange((value) => {
      this.target = value;
      this.runTranslation();
    });
    const source = this.contentEl.createEl("details", {
      cls: "flash-translate-source",
    });
    source.open = this.snapshot.text.length < 400;
    source.createEl("summary", { text: "Selected text" });
    source.createEl("p", { text: this.snapshot.text });
    const resultLabel = this.contentEl.createEl("label", {
      text: "Translation",
      cls: "flash-translate-result-label",
    });
    this.resultEl = resultLabel.createEl("textarea", {
      cls: "flash-translate-result",
      attr: { rows: "5", "aria-label": "Translation", spellcheck: "false" },
    });
    this.resultEl.addEventListener("input", () =>
      this.setActionsEnabled(Boolean(this.resultEl?.value.trim()))
    );
    this.statusEl = this.contentEl.createDiv({
      cls: "flash-translate-status",
      attr: { role: "status", "aria-live": "polite" },
    });
    const footer = this.contentEl.createDiv({ cls: "flash-translate-actions" });
    this.retry = new ButtonComponent(footer)
      .setButtonText("Retry")
      .onClick(() => this.runTranslation());
    this.retry.buttonEl.hidden = true;
    const copy = new ButtonComponent(footer)
      .setButtonText("Copy")
      .onClick(async () => {
        try {
          await navigator.clipboard.writeText(this.resultEl?.value ?? "");
          this.statusEl?.setText("Translation copied.");
        } catch {
          this.showError(
            "Could not copy. Select and copy the translation manually."
          );
        }
      });
    const insert = new ButtonComponent(footer)
      .setButtonText("Insert below")
      .onClick(() => this.apply("insert"));
    const replace = new ButtonComponent(footer)
      .setButtonText("Replace selection")
      .setCta()
      .onClick(() => this.apply("replace"));
    this.actions = [copy, insert, replace];
    this.runTranslation();
  }

  private setActionsEnabled(enabled: boolean): void {
    for (const action of this.actions) {
      action.setDisabled(!enabled);
    }
  }

  private showError(message: string): void {
    this.statusEl?.setText(message);
    this.statusEl?.addClass("is-error");
  }

  private async runTranslation(): Promise<void> {
    const generation = ++this.generation;
    this.setActionsEnabled(false);
    if (this.resultEl) {
      this.resultEl.value = "";
      this.resultEl.disabled = true;
    }
    if (this.retry) {
      this.retry.buttonEl.hidden = true;
    }
    this.statusEl?.removeClass("is-error");
    this.statusEl?.setText("Translating…");
    try {
      const result = await this.options.translate(this.target);
      if (generation !== this.generation) {
        return;
      }
      if (this.resultEl) {
        this.resultEl.value = result;
        this.resultEl.disabled = false;
      }
      this.setActionsEnabled(true);
      this.statusEl?.setText(
        "Ready. You can edit the translation before inserting."
      );
    } catch (error) {
      if (generation !== this.generation) {
        return;
      }
      this.showError(
        error instanceof Error ? error.message : "Translation failed."
      );
      if (this.retry) {
        this.retry.buttonEl.hidden = false;
      }
    }
  }

  private apply(mode: "replace" | "insert"): void {
    try {
      this.options.apply(this.resultEl?.value ?? "", mode);
      this.close();
    } catch (error) {
      this.showError(
        error instanceof Error
          ? error.message
          : "Could not insert the translation."
      );
    }
  }

  onClose(): void {
    this.generation += 1;
    this.contentEl.empty();
    this.options.onClose();
  }
}
