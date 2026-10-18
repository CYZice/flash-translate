import {
  getLanguage,
  PluginSettingTab,
  SecretComponent,
  Setting,
} from "obsidian";
import { SUPPORTED_LANGUAGES } from "../../src/shared/constants/languages";
import type { AiReasoningEffort } from "../../src/shared/translation/config";
import { getTranslationSettingsCopy } from "../../src/shared/translation/settings-copy";
import type FlashTranslatePlugin from "./main";

type Copy = ReturnType<typeof getTranslationSettingsCopy>;

export class TranslationSettingsTab extends PluginSettingTab {
  private readonly plugin: FlashTranslatePlugin;

  constructor(plugin: FlashTranslatePlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const copy = getTranslationSettingsCopy(getLanguage());
    this.containerEl.empty();
    this.languages(copy);
    this.behavior(copy);
    this.service(copy);
  }

  private languages(copy: Copy): void {
    const el = this.containerEl;
    new Setting(el).setName(copy.languages).setHeading();
    new Setting(el)
      .setName(copy.autoZhEn)
      .setDesc(copy.autoZhEnDescription)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoZhEn)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ autoZhEn: value });
            this.display();
          })
      );
    if (this.plugin.settings.autoZhEn) {
      el.createEl("p", {
        text: copy.automaticLanguages,
        cls: "setting-item-description",
      });
      return;
    }
    for (const field of ["sourceLanguage", "targetLanguage"] as const) {
      new Setting(el)
        .setName(field === "sourceLanguage" ? copy.source : copy.target)
        .addDropdown((dropdown) => {
          if (field === "sourceLanguage") {
            dropdown.addOption("auto", copy.autoSource);
          }
          for (const language of SUPPORTED_LANGUAGES) {
            dropdown.addOption(language.code, language.nativeName);
          }
          dropdown
            .setValue(this.plugin.settings[field])
            .onChange((value) =>
              this.plugin.updateSettings({ [field]: value })
            );
        });
    }
  }

  private behavior(copy: Copy): void {
    const el = this.containerEl;
    new Setting(el).setName(copy.behavior).setHeading();
    new Setting(el)
      .setName(copy.trigger)
      .setDesc(copy.triggerDescription)
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            badge: copy.badge,
            immediate: copy.immediate,
            off: copy.commandOnly,
          })
          .setValue(this.plugin.settings.selectionTrigger)
          .onChange((value) =>
            this.plugin.updateSettings({
              selectionTrigger: value as "badge" | "immediate" | "off",
            })
          )
      );
  }

  private service(copy: Copy): void {
    const el = this.containerEl;
    new Setting(el).setName(copy.ai).setHeading();
    new Setting(el)
      .setName(copy.baseUrl)
      .setDesc(copy.baseUrlDescription)
      .addText((text) =>
        text
          .setPlaceholder("https://your-provider.example/v1")
          .setValue(this.plugin.settings.baseUrl)
          .onChange((value) => this.plugin.updateSettings({ baseUrl: value }))
      );
    const secret = new Setting(el)
      .setName(copy.apiKey)
      .setDesc(copy.secretDescription);
    new SecretComponent(this.app, secret.controlEl)
      .setValue(this.plugin.settings.apiKeySecret)
      .onChange((value) =>
        this.plugin.updateSettings({ apiKeySecret: value ?? "" })
      );
    new Setting(el)
      .setName(copy.model)
      .setDesc(copy.modelDescription)
      .addText((text) =>
        text
          .setPlaceholder("Model ID")
          .setValue(this.plugin.settings.model)
          .onChange((value) => this.plugin.updateSettings({ model: value }))
      );
    new Setting(el)
      .setName(copy.contextRange)
      .setDesc(copy.contextDescription)
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({ "0": "0", "1": "1", "2": "2", "3": "3" })
          .setValue(String(this.plugin.settings.contextSentenceCount))
          .onChange((value) =>
            this.plugin.updateSettings({ contextSentenceCount: Number(value) })
          )
      );
    const advanced = el.createEl("details");
    advanced.createEl("summary", { text: copy.advanced });
    this.advanced(advanced, copy);
  }

  private advanced(el: HTMLElement, copy: Copy): void {
    new Setting(el)
      .setName(copy.systemPrompt)
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.systemPrompt)
          .onChange((value) =>
            this.plugin.updateSettings({ systemPrompt: value })
          )
      );
    new Setting(el).setName(copy.thinking).addToggle((toggle) =>
      toggle
        .setValue(this.plugin.settings.thinkingEnabled)
        .onChange(async (value) => {
          await this.plugin.updateSettings({ thinkingEnabled: value });
          effort.setDisabled(!value);
        })
    );
    const effort = new Setting(el)
      .setName(copy.reasoningEffort)
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            low: copy.effortLow,
            high: copy.effortHigh,
            max: copy.effortMax,
          })
          .setValue(this.plugin.settings.reasoningEffort)
          .onChange((value) =>
            this.plugin.updateSettings({
              reasoningEffort: value as AiReasoningEffort,
            })
          )
      );
    effort.setDisabled(!this.plugin.settings.thinkingEnabled);
  }
}
