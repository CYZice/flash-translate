interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
];

export const DEFAULT_SOURCE_LANGUAGE = "zh";
export const DEFAULT_TARGET_LANGUAGE = "en";

/**
 * Use the Chinese pair as the representative pair for model availability.
 * English remains the fallback source when the target itself is Chinese.
 */
export function getRepresentativeSourceLanguage(
  targetLanguage: string
): string {
  return targetLanguage === "zh" ? "en" : "zh";
}

export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

export function getLanguageDisplayName(code: string): string {
  const language = getLanguageByCode(code);
  return language ? `${language.nativeName} (${language.name})` : code;
}

/**
 * Returns uppercase language code (e.g., "en" -> "EN")
 */
export function getLanguageUpperCode(code: string): string {
  return code.toUpperCase();
}

/**
 * Returns native name for a language code
 * Falls back to the code itself if not found
 */
export function getLanguageNativeName(code: string): string {
  return getLanguageByCode(code)?.nativeName ?? code;
}

/**
 * Returns English name for a language code
 * Falls back to the code itself if not found
 */
export function getLanguageEnglishName(code: string): string {
  return getLanguageByCode(code)?.name ?? code;
}

/**
 * Get all language codes as an array
 */
export function getAllLanguageCodes(): string[] {
  return SUPPORTED_LANGUAGES.map((l) => l.code);
}
