import { type Editor, Notice, Plugin, requestUrl } from "obsidian";
import { getEnglishChinesePair } from "../../src/shared/translation/bilingual";
import {
  applyUsageEvent,
  EMPTY_USAGE,
  normalizeUsage,
  type TranslationUsage,
  type UsageEvent,
} from "../../src/shared/translation/usage";
import { readActiveSelection } from "./editor-selection";
import { captureSelection, planTranslationEdit } from "./selection";
import { SelectionController } from "./selection-controller";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type ObsidianTranslationSettings,
} from "./settings";
import { TranslationSettingsTab } from "./settings-tab";
import {
  TranslationCard,
  type TranslationCardContent,
} from "./translation-card";
import { TranslationRequestQueue } from "./translation-request-queue";
import { translateNoteSelection } from "./translation-service";
import { UsageTransport } from "./usage-transport";
import {
  readWorkspaceSelection,
  type SelectedSource,
} from "./workspace-selection";

export default class FlashTranslatePlugin extends Plugin {
  settings: ObsidianTranslationSettings = { ...DEFAULT_SETTINGS };
  usage: TranslationUsage = { ...EMPTY_USAGE };
  private settingsTab: TranslationSettingsTab | null = null;
  private persistence: Promise<void> = Promise.resolve();
  private card: TranslationCard | null = null;
  private readonly controllers = new Map<Document, SelectionController>();
  private readonly transport = new UsageTransport(requestUrl, (event) =>
    this.recordUsage(event)
  );
  private readonly requests = new TranslationRequestQueue(
    this.transport.request
  );
  private unloaded = false;

  async onload(): Promise<void> {
    const data: unknown = await this.loadData();
    this.settings = normalizeSettings(data);
    this.usage = normalizeUsage(
      typeof data === "object" && data !== null
        ? (data as Record<string, unknown>).usage
        : undefined
    );
    this.settingsTab = new TranslationSettingsTab(this);
    this.addSettingTab(this.settingsTab);
    this.addCommand({
      id: "translate-selection",
      name: "Translate selection",
      checkCallback: (checking) => {
        const source = this.commandSelection();
        if (source && !checking) {
          this.translate(source);
        }
        return Boolean(source);
      },
    });
    const workspace = this.app.workspace;
    this.registerEvent(
      workspace.on("editor-menu", (menu, editor, view) => {
        const path = view.file?.path;
        if (path && editor.getSelection().trim()) {
          menu.addItem((item) =>
            item
              .setTitle("Translate selection")
              .setIcon("languages")
              .onClick(() =>
                this.translateEditor(editor, path, editor.getSelection())
              )
          );
        }
      })
    );
    this.registerEvent(
      workspace.on("window-open", (_workspaceWindow, win) =>
        this.attach(win.document)
      )
    );
    this.registerEvent(
      workspace.on("window-close", (_workspaceWindow, win) => {
        if (this.card?.document === win.document) {
          this.card.close();
        }
        this.controllers.get(win.document)?.dispose();
        this.controllers.delete(win.document);
      })
    );
    this.attach(workspace.containerEl.ownerDocument);
    workspace.onLayoutReady(() =>
      workspace.iterateAllLeaves((leaf) =>
        this.attach(leaf.view.containerEl.ownerDocument)
      )
    );
  }

  private contains(document: Document, node: Node): boolean {
    let found = false;
    this.app.workspace.iterateAllLeaves((leaf) => {
      const container = leaf.view.containerEl;
      if (container.ownerDocument === document && container.contains(node)) {
        found = true;
      }
    });
    return found;
  }

  private read(document: Document): SelectedSource | null {
    return readWorkspaceSelection(
      document,
      this.app.workspace.activeEditor,
      (node) => this.contains(document, node)
    );
  }

  private attach(document: Document): void {
    if (this.unloaded || this.controllers.has(document)) {
      return;
    }
    this.controllers.set(
      document,
      new SelectionController(document, {
        read: () => this.read(document),
        trigger: () => this.settings.selectionTrigger,
        pinned: () =>
          Boolean(this.card?.document === document && this.card.isPinned),
        translate: (source) => this.translate(source),
        dismiss: () => {
          if (this.card?.document === document) {
            this.card.close();
          }
        },
      })
    );
  }

  private commandSelection(): SelectedSource | null {
    for (const [document, controller] of this.controllers) {
      if (!document.hasFocus()) {
        continue;
      }
      const source =
        this.read(document) ??
        (document.activeElement?.closest(".prompt")
          ? controller.pending
          : null);
      if (source) {
        return source;
      }
    }
    return null;
  }

  async updateSettings(
    patch: Partial<ObsidianTranslationSettings>
  ): Promise<void> {
    this.settings = normalizeSettings({ ...this.settings, ...patch });
    for (const controller of this.controllers.values()) {
      controller.reset();
    }
    await this.persist();
  }

  private persist(): Promise<void> {
    const snapshot = { ...this.settings, usage: { ...this.usage } };
    const work = this.persistence
      .catch(() => undefined)
      .then(() => this.saveData(snapshot));
    this.persistence = work;
    return work;
  }

  private recordUsage(event: UsageEvent): void {
    this.usage = applyUsageEvent(this.usage, event);
    if (!this.unloaded) {
      this.settingsTab?.refreshUsage();
    }
    this.persist().catch(() =>
      console.warn("[flash-translate] Could not save usage statistics.")
    );
  }

  private translateEditor(editor: Editor, path: string, text: string): void {
    // Editor menu callbacks can also originate in pop-out windows.
    let document = this.app.workspace.containerEl.ownerDocument;
    for (const candidate of this.controllers.keys()) {
      if (candidate.hasFocus()) {
        document = candidate;
        break;
      }
    }
    const selection = document.getSelection();
    this.translate({
      document,
      text,
      rect: selection?.rangeCount
        ? selection.getRangeAt(0).getBoundingClientRect()
        : document.body.getBoundingClientRect(),
      note: {
        editor,
        path,
        start: editor.posToOffset(editor.getCursor("from")),
        end: editor.posToOffset(editor.getCursor("to")),
      },
      readContext: () => ({ contextBefore: "", contextAfter: "" }),
    });
  }

  private content(source: SelectedSource): TranslationCardContent {
    const settings = { ...this.settings };
    const apiKey = settings.apiKeySecret
      ? this.app.secretStorage.getSecret(settings.apiKeySecret)
      : "";
    if (settings.apiKeySecret && !apiKey) {
      throw new Error(
        "The selected API key is missing. Choose a secret in Settings → Flash Translate."
      );
    }
    let apply: TranslationCardContent["apply"];
    let text = source.text;
    let context: { contextBefore: string; contextAfter: string };
    const note = source.note;
    if (note) {
      const current = readActiveSelection(
        note.editor,
        this.app.workspace.activeEditor
      );
      if (
        current.path !== note.path ||
        current.start !== note.start ||
        current.end !== note.end ||
        current.document.slice(note.start, note.end) !== source.text
      ) {
        throw new Error("The selection changed. Select the text again.");
      }
      const snapshot = captureSelection(
        current.document,
        note.path,
        note.start,
        note.end,
        settings.contextSentenceCount
      );
      text = snapshot.text;
      context = snapshot;
      const editor = note.editor;
      apply = (translation, mode) => {
        const edit = planTranslationEdit(
          snapshot,
          readActiveSelection(editor, this.app.workspace.activeEditor),
          translation,
          mode
        );
        editor.replaceRange(
          edit.text,
          editor.offsetToPos(edit.from),
          editor.offsetToPos(edit.to)
        );
        editor.setCursor(editor.offsetToPos(edit.from + edit.text.length));
        editor.focus();
      };
    } else {
      context = source.readContext(settings.contextSentenceCount);
    }
    const languages = settings.autoZhEn
      ? getEnglishChinesePair(text)
      : settings;
    const input = {
      text,
      contextBefore: context.contextBefore,
      contextAfter: context.contextAfter,
      sourceLanguage: languages.sourceLanguage,
    };
    return {
      text,
      model: settings.model,
      sourceLanguage: languages.sourceLanguage,
      targetLanguage: languages.targetLanguage,
      autoZhEn: settings.autoZhEn,
      onTargetChange: settings.autoZhEn
        ? (targetLanguage) => {
            this.updateSettings({ autoZhEn: false, targetLanguage });
          }
        : undefined,
      apply,
      translate: async (targetLanguage, signal) => {
        const result = await translateNoteSelection(
          { ...input, targetLanguage },
          settings,
          apiKey ?? "",
          this.requests.request,
          signal
        );
        signal.throwIfAborted();
        this.recordUsage({ type: "completed" });
        return result;
      },
    };
  }

  private translate(source: SelectedSource): void {
    try {
      if (!(this.settings.baseUrl && this.settings.model)) {
        throw new Error(
          "Configure the API endpoint and model in Settings → Flash Translate first."
        );
      }
      const content = this.content(source);
      if (this.card?.document !== source.document) {
        this.card?.close();
      }
      for (const [document, controller] of this.controllers) {
        if (document === source.document) {
          controller.acknowledge(source);
        } else {
          controller.reset();
        }
      }
      if (!this.card) {
        const card = new TranslationCard(source.document, () => {
          if (this.card === card) {
            this.card = null;
          }
          for (const controller of this.controllers.values()) {
            controller.reset();
          }
        });
        this.card = card;
      }
      this.card.update(content, source.rect);
    } catch (error) {
      // biome-ignore lint/correctness/noUnusedInstantiation: Obsidian displays Notice instances immediately.
      new Notice(
        error instanceof Error
          ? error.message
          : "Could not translate the selection."
      );
    }
  }

  onunload(): void {
    this.unloaded = true;
    this.transport.dispose();
    this.settingsTab = null;
    this.card?.close();
    for (const controller of this.controllers.values()) {
      controller.dispose();
    }
    this.controllers.clear();
    this.requests.dispose();
  }
}
