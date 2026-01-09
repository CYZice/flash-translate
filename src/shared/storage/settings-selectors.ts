import type { ExclusionPattern, TranslationSettings } from "./settings";

/**
 * Type for selector functions that extract data from TranslationSettings
 */
export type SettingsSelector<T> = (settings: TranslationSettings) => T;

// Individual field selectors
export const selectTargetLanguage: SettingsSelector<string> = (s) =>
  s.targetLanguage;

export const selectSourceLanguage: SettingsSelector<string> = (s) =>
  s.sourceLanguage;

export const selectSkipSameLanguage: SettingsSelector<boolean> = (s) =>
  s.skipSameLanguage;

export const selectExclusionPatterns: SettingsSelector<ExclusionPattern[]> = (
  s
) => s.exclusionPatterns;

export const selectAutoDetectLanguage: SettingsSelector<boolean> = (s) =>
  s.autoDetectLanguage;

// Composite selectors for specific use cases

/**
 * Settings needed by content/app.tsx and TranslationCard
 */
interface ContentAppSettings {
  sourceLanguage: string;
  targetLanguage: string;
  skipSameLanguage: boolean;
  exclusionPatterns: ExclusionPattern[];
  autoDetectLanguage: boolean;
}

export const selectContentAppSettings: SettingsSelector<ContentAppSettings> = (
  s
) => ({
  sourceLanguage: s.sourceLanguage,
  targetLanguage: s.targetLanguage,
  skipSameLanguage: s.skipSameLanguage,
  exclusionPatterns: s.exclusionPatterns,
  autoDetectLanguage: s.autoDetectLanguage,
});

/**
 * Settings needed by language-settings.tsx
 */
interface LanguageSettingsData {
  sourceLanguage: string;
  targetLanguage: string;
}

export const selectLanguageSettings: SettingsSelector<LanguageSettingsData> = (
  s
) => ({
  sourceLanguage: s.sourceLanguage,
  targetLanguage: s.targetLanguage,
});
