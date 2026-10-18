import { PluginSettingTab, SecretComponent, Setting } from "obsidian";
import { SUPPORTED_LANGUAGES } from "../../src/shared/constants/languages";
import type FlashTranslatePlugin from "./main";

export class TranslationSettingsTab extends PluginSettingTab {
  private readonly plugin: FlashTranslatePlugin;

  constructor(plugin: FlashTranslatePlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName("Selection translation")
      .setDesc(
        "Works in note editors, reading views, and selectable plugin output. A pinned card updates in place on each new selection."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            badge: "Show translation button",
            immediate: "Translate immediately",
            off: "Command only",
          })
          .setValue(this.plugin.settings.selectionTrigger)
          .onChange((value) =>
            this.plugin.updateSettings({
              selectionTrigger: value as "badge" | "immediate" | "off",
            })
          )
      );
    new Setting(containerEl).setName("Translation service").setHeading();
    new Setting(containerEl)
      .setName("Base URL")
      .setDesc(
        "Your compatible API base URL, including /v1 when required. Selected text and nearby context are sent only when you request translation."
      )
      .addText((text) =>
        text
          .setPlaceholder("https://your-provider.example/v1")
          .setValue(this.plugin.settings.baseUrl)
          .onChange((value) => this.plugin.updateSettings({ baseUrl: value }))
      );
    new Setting(containerEl)
      .setName("Model")
      .setDesc(
        "Use the exact model ID provided by your service or local model server."
      )
      .addText((text) =>
        text
          .setPlaceholder("Model ID")
          .setValue(this.plugin.settings.model)
          .onChange((value) => this.plugin.updateSettings({ model: value }))
      );
    const secret = new Setting(containerEl)
      .setName("API key")
      .setDesc(
        "Choose or create a secret in Obsidian. Only its reference is saved in plugin settings. Leave empty for a local service without authentication."
      );
    new SecretComponent(this.app, secret.controlEl)
      .setValue(this.plugin.settings.apiKeySecret)
      .onChange((value) =>
        this.plugin.updateSettings({ apiKeySecret: value ?? "" })
      );
    new Setting(containerEl).setName("Languages").setHeading();
    new Setting(containerEl)
      .setName("自动中英互译 / Auto Chinese ↔ English")
      .setDesc(
        "Chinese or mixed Chinese/English → English; English → Chinese. No language-detection model is downloaded."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoZhEn)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ autoZhEn: value });
            this.display();
          })
      );
    new Setting(containerEl)
      .setName("Source language")
      .setDesc("Used when automatic Chinese ↔ English is off.")
      .addDropdown((dropdown) => {
        dropdown.setDisabled(this.plugin.settings.autoZhEn);
        dropdown.addOption("auto", "Auto detect");
        for (const language of SUPPORTED_LANGUAGES) {
          dropdown.addOption(language.code, language.name);
        }
        dropdown
          .setValue(this.plugin.settings.sourceLanguage)
          .onChange((value) =>
            this.plugin.updateSettings({
              sourceLanguage: value,
              autoZhEn: false,
            })
          );
      });
    new Setting(containerEl)
      .setName("Default target language")
      .setDesc(
        "Used when automatic Chinese ↔ English is off. Choosing a target in the card switches to manual translation."
      )
      .addDropdown((dropdown) => {
        dropdown.setDisabled(this.plugin.settings.autoZhEn);
        for (const language of SUPPORTED_LANGUAGES) {
          dropdown.addOption(language.code, language.name);
        }
        dropdown
          .setValue(this.plugin.settings.targetLanguage)
          .onChange((value) =>
            this.plugin.updateSettings({
              targetLanguage: value,
              autoZhEn: false,
            })
          );
      });
    new Setting(containerEl)
      .setName("Context sentences")
      .setDesc(
        "Nearby sentences sent with the selection to clarify terminology. Set to 0 to send only selected text."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({ "0": "0", "1": "1", "2": "2", "3": "3" })
          .setValue(String(this.plugin.settings.contextSentenceCount))
          .onChange((value) =>
            this.plugin.updateSettings({ contextSentenceCount: Number(value) })
          )
      );
    new Setting(containerEl)
      .setName("Translation prompt")
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.systemPrompt)
          .onChange((value) =>
            this.plugin.updateSettings({ systemPrompt: value })
          )
      );
  }
}
