import { createPrefixedLogger } from "@/shared/utils/logger";

const log = createPrefixedLogger("ai-api-key");
const AI_API_KEY_STORAGE_KEY = "flash-translate-ai-api-key";

function isContextValid(): boolean {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

export async function getAiApiKey(): Promise<string> {
  if (!isContextValid()) {
    return "";
  }

  try {
    const result = await chrome.storage.local.get([AI_API_KEY_STORAGE_KEY]);
    const value = result[AI_API_KEY_STORAGE_KEY];
    return typeof value === "string" ? value : "";
  } catch (error) {
    log.error("Failed to get AI API key:", error);
    return "";
  }
}

export async function saveAiApiKey(apiKey: string): Promise<void> {
  if (!isContextValid()) {
    return;
  }

  try {
    await chrome.storage.local.set({
      [AI_API_KEY_STORAGE_KEY]: apiKey.trim(),
    });
  } catch (error) {
    log.error("Failed to save AI API key:", error);
  }
}
