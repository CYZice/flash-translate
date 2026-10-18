import { SUPPORTED_LANGUAGES } from "../../src/shared/constants/languages";
import { DEFAULT_AI_SYSTEM_PROMPT } from "../../src/shared/translation/config";
import { normalizeAiContextSentenceCount } from "../../src/shared/utils/ai-context";

export interface ObsidianTranslationSettings {
  baseUrl: string;
  model: string;
  apiKeySecret: string;
  sourceLanguage: string;
  targetLanguage: string;
  systemPrompt: string;
  contextSentenceCount: number;
  selectionTrigger: "badge" | "immediate" | "off";
  autoZhEn: boolean;
}

export const DEFAULT_SETTINGS: ObsidianTranslationSettings = {
  baseUrl: "",
  model: "",
  apiKeySecret: "",
  sourceLanguage: "auto",
  targetLanguage: "en",
  systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
  contextSentenceCount: 1,
  selectionTrigger: "badge",
  autoZhEn: false,
};

const LANGUAGE_CODES = new Set(
  SUPPORTED_LANGUAGES.map((language) => language.code)
);

export function normalizeSettings(value: unknown): ObsidianTranslationSettings {
  const settings = { ...DEFAULT_SETTINGS };
  if (typeof value !== "object" || value === null) {
    return settings;
  }
  const data = value as Record<string, unknown>;
  if (typeof data.autoZhEn === "boolean") {
    settings.autoZhEn = data.autoZhEn;
  }
  if (
    data.selectionTrigger === "badge" ||
    data.selectionTrigger === "immediate" ||
    data.selectionTrigger === "off"
  ) {
    settings.selectionTrigger = data.selectionTrigger;
  }
  for (const key of [
    "baseUrl",
    "model",
    "apiKeySecret",
    "systemPrompt",
  ] as const) {
    if (typeof data[key] === "string") {
      settings[key] = data[key].trim();
    }
  }
  if (
    typeof data.sourceLanguage === "string" &&
    (data.sourceLanguage === "auto" || LANGUAGE_CODES.has(data.sourceLanguage))
  ) {
    settings.sourceLanguage = data.sourceLanguage;
  }
  if (
    typeof data.targetLanguage === "string" &&
    LANGUAGE_CODES.has(data.targetLanguage)
  ) {
    settings.targetLanguage = data.targetLanguage;
  }
  settings.contextSentenceCount = normalizeAiContextSentenceCount(
    data.contextSentenceCount
  );
  return settings;
}
