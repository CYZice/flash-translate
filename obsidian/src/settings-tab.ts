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
      .setName("Source language")
      .addDropdown((dropdown) => {
        dropdown.addOption("auto", "Auto detect");
        for (const language of SUPPORTED_LANGUAGES) {
          dropdown.addOption(language.code, language.name);
        }
        dropdown
          .setValue(this.plugin.settings.sourceLanguage)
          .onChange((value) =>
            this.plugin.updateSettings({ sourceLanguage: value })
          );
      });
    new Setting(containerEl)
      .setName("Default target language")
      .addDropdown((dropdown) => {
        for (const language of SUPPORTED_LANGUAGES) {
          dropdown.addOption(language.code, language.name);
        }
        dropdown
          .setValue(this.plugin.settings.targetLanguage)
          .onChange((value) =>
            this.plugin.updateSettings({ targetLanguage: value })
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
