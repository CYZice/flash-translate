import { normalizeUsage, type TranslationUsage } from "../translation/usage";

export const USAGE_STORAGE_KEY = "flash-translate-usage";
export const LOCAL_TRANSLATION_COMPLETED = "flash-translate-local-completed";

export async function getUsage(): Promise<TranslationUsage> {
  const data = await chrome.storage.local.get(USAGE_STORAGE_KEY);
  return normalizeUsage(data[USAGE_STORAGE_KEY]);
}

/** Numeric bookkeeping must never prevent a translation or keep its text alive. */
export async function reportLocalTranslation(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: LOCAL_TRANSLATION_COMPLETED,
    });
    if (response?.ok === false) {
      throw new Error("Usage storage unavailable");
    }
  } catch {
    console.warn("[flash-translate] Could not record translation usage.");
  }
}
