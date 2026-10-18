import { type Editor, Notice, Plugin, requestUrl } from "obsidian";
import { readActiveSelection } from "./editor-selection";
import { captureSelection, planTranslationEdit } from "./selection";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type ObsidianTranslationSettings,
} from "./settings";
import { TranslationSettingsTab } from "./settings-tab";
import { TranslationPreview } from "./translation-modal";
import { translateNoteSelection } from "./translation-service";

export default class FlashTranslatePlugin extends Plugin {
  settings: ObsidianTranslationSettings = { ...DEFAULT_SETTINGS };
  private preview: TranslationPreview | null = null;

  async onload(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
    this.addSettingTab(new TranslationSettingsTab(this));
    this.addCommand({
      id: "translate-selection",
      name: "Translate selection",
      editorCheckCallback: (checking, editor, view) => {
        const available = Boolean(view.file && editor.getSelection().trim());
        if (!checking && available && view.file) {
          this.translateSelection(editor, view.file.path);
        }
        return available;
      },
    });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        const file = view.file;
        if (file && editor.getSelection().trim()) {
          menu.addItem((item) =>
            item
              .setTitle("Translate selection")
              .setIcon("languages")
              .onClick(() => this.translateSelection(editor, file.path))
          );
        }
      })
    );
  }

  async updateSettings(
    patch: Partial<ObsidianTranslationSettings>
  ): Promise<void> {
    this.settings = normalizeSettings({ ...this.settings, ...patch });
    await this.saveData(this.settings);
  }

  private translateSelection(editor: Editor, path: string): void {
    if (!(this.settings.baseUrl && this.settings.model)) {
      // biome-ignore lint/correctness/noUnusedInstantiation: Obsidian displays Notice instances immediately.
      new Notice(
        "Configure the API endpoint and model in Settings → Flash Translate first."
      );
      return;
    }
    try {
      const snapshot = captureSelection(
        editor.getValue(),
        path,
        editor.posToOffset(editor.getCursor("from")),
        editor.posToOffset(editor.getCursor("to")),
        this.settings.contextSentenceCount
      );
      const settings = { ...this.settings };
      const apiKey = settings.apiKeySecret
        ? this.app.secretStorage.getSecret(settings.apiKeySecret)
        : "";
      if (settings.apiKeySecret && !apiKey) {
        throw new Error(
          "The selected API key is missing. Choose a secret in Settings → Flash Translate."
        );
      }
      this.preview?.close();
      const preview = new TranslationPreview(this.app, snapshot, {
        model: settings.model,
        targetLanguage: settings.targetLanguage,
        translate: (targetLanguage) =>
          translateNoteSelection(
            {
              ...snapshot,
              sourceLanguage: settings.sourceLanguage,
              targetLanguage,
            },
            settings,
            apiKey ?? "",
            requestUrl
          ),
        apply: (translation, mode) => {
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
        },
        onClose: () => {
          if (this.preview === preview) {
            this.preview = null;
          }
        },
      });
      this.preview = preview;
      preview.open();
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
    this.preview?.close();
  }
}
