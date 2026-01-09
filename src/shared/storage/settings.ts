import { createPrefixedLogger } from "@/shared/utils/logger";

const log = createPrefixedLogger("settings");

export interface ExclusionPattern {
  id: string;
  pattern: string; // origin + path prefix (e.g., "https://example.com/admin")
  enabled: boolean;
}

export interface TranslationSettings {
  sourceLanguage: string;
  targetLanguage: string;
  exclusionPatterns: ExclusionPattern[];
  skipSameLanguage: boolean;
  autoDetectLanguage: boolean;
}

const STORAGE_KEY = "flash-translate-settings";
const LANG_SEPARATOR_REGEX = /[-_]/;

const DEFAULT_SETTINGS: TranslationSettings = {
  sourceLanguage: "en",
  targetLanguage: "ja",
  exclusionPatterns: [],
  skipSameLanguage: true,
  autoDetectLanguage: true,
};

// Type guard for ExclusionPattern
function isExclusionPattern(value: unknown): value is ExclusionPattern {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ExclusionPattern).id === "string" &&
    typeof (value as ExclusionPattern).pattern === "string" &&
    typeof (value as ExclusionPattern).enabled === "boolean"
  );
}

// Validate and normalize settings from storage
function validateSettings(data: unknown): Partial<TranslationSettings> {
  if (typeof data !== "object" || data === null) {
    return {};
  }

  const result: Partial<TranslationSettings> = {};
  const obj = data as Record<string, unknown>;

  if (typeof obj.sourceLanguage === "string") {
    result.sourceLanguage = obj.sourceLanguage;
  }
  if (typeof obj.targetLanguage === "string") {
    result.targetLanguage = obj.targetLanguage;
  }
  if (typeof obj.skipSameLanguage === "boolean") {
    result.skipSameLanguage = obj.skipSameLanguage;
  }
  if (typeof obj.autoDetectLanguage === "boolean") {
    result.autoDetectLanguage = obj.autoDetectLanguage;
  }
  if (Array.isArray(obj.exclusionPatterns)) {
    result.exclusionPatterns = obj.exclusionPatterns.filter(isExclusionPattern);
  }

  return result;
}

// Helper to check if a URL matches any enabled exclusion pattern
// Uses stricter matching to prevent false positives (e.g., example.com.evil.com)
export function isUrlExcluded(
  url: string,
  patterns: ExclusionPattern[]
): boolean {
  return patterns.some((p) => {
    if (!p.enabled) {
      return false;
    }
    // Exact match or path prefix match (with / boundary)
    if (url === p.pattern) {
      return true;
    }
    // Ensure pattern ends with / or url has / after pattern
    if (url.startsWith(p.pattern)) {
      const nextChar = url[p.pattern.length];
      return nextChar === undefined || nextChar === "/" || nextChar === "?";
    }
    return false;
  });
}

// Pure function: Normalize language code (e.g., "ja-JP" -> "ja", "zh-CN" -> "zh")
export function normalizeLanguageCode(lang: string): string {
  return lang.split(LANG_SEPARATOR_REGEX)[0].toLowerCase();
}

// Pure function: Check if languages match (both normalized for comparison)
export function isLanguageMatch(
  pageLanguage: string | null,
  targetLanguage: string
): boolean {
  if (!pageLanguage) {
    return false;
  }
  return (
    normalizeLanguageCode(pageLanguage) ===
    normalizeLanguageCode(targetLanguage)
  );
}

// DOM accessor: Get the page's language from the HTML lang attribute
export function getPageLanguage(): string | null {
  const lang = document.documentElement.lang;
  return lang || null;
}

// Pure function: Determine if translation should be skipped
export function shouldSkipTranslation(
  targetLanguage: string,
  skipSameLanguage: boolean,
  pageLanguage: string | null
): boolean {
  if (!skipSameLanguage) {
    return false;
  }
  return isLanguageMatch(pageLanguage, targetLanguage);
}

// Generate a unique ID for exclusion patterns
export function generatePatternId(): string {
  return `pattern_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Check if extension context is still valid
function isContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

export async function getSettings(): Promise<TranslationSettings> {
  if (!isContextValid()) {
    return DEFAULT_SETTINGS;
  }

  try {
    const result = await chrome.storage.sync.get([STORAGE_KEY]);
    const rawSettings = result[STORAGE_KEY];
    const validatedSettings = validateSettings(rawSettings);
    return { ...DEFAULT_SETTINGS, ...validatedSettings };
  } catch (error) {
    log.error("Failed to get settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(
  settings: Partial<TranslationSettings>
): Promise<void> {
  if (!isContextValid()) {
    return;
  }

  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.sync.set({ [STORAGE_KEY]: updated });
  } catch (error) {
    log.error("Failed to save settings:", error);
  }
}

export function subscribeToSettings(
  callback: (settings: TranslationSettings) => void
): () => void {
  if (!isContextValid()) {
    // biome-ignore lint/suspicious/noEmptyBlockStatements: no-op cleanup for invalid context
    return () => {};
  }

  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (!isContextValid()) {
      return;
    }
    if (areaName === "sync" && changes[STORAGE_KEY]) {
      const rawSettings = changes[STORAGE_KEY].newValue;
      const validatedSettings = validateSettings(rawSettings);
      callback({ ...DEFAULT_SETTINGS, ...validatedSettings });
    }
  };

  try {
    chrome.storage.onChanged.addListener(listener);
    return () => {
      if (isContextValid()) {
        chrome.storage.onChanged.removeListener(listener);
      }
    };
  } catch (error) {
    log.error("Failed to subscribe to settings:", error);
    // biome-ignore lint/suspicious/noEmptyBlockStatements: no-op cleanup for error case
    return () => {};
  }
}
