import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from "@/shared/constants/languages";
import { getEnglishChinesePair } from "@/shared/translation/bilingual";

export function resolveTranslationLanguages(
  settings: {
    sourceLanguage: string;
    targetLanguage: string;
    autoZhEn: boolean;
  } | null,
  text: string,
  detectedSource: string,
  autoDetectEnabled: boolean
): { sourceLanguage: string; targetLanguage: string } {
  if (settings?.autoZhEn) {
    return getEnglishChinesePair(text);
  }
  return {
    sourceLanguage: autoDetectEnabled
      ? detectedSource
      : (settings?.sourceLanguage ?? DEFAULT_SOURCE_LANGUAGE),
    targetLanguage: settings?.targetLanguage ?? DEFAULT_TARGET_LANGUAGE,
  };
}
