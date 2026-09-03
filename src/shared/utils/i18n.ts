import { createPrefixedLogger } from "./logger";

const log = createPrefixedLogger("i18n");

/**
 * Type-safe wrapper for chrome.i18n.getMessage
 * Returns the localized message or the key if not found (dev fallback)
 */
export function getMessage(
  key: string,
  substitutions?: string | string[]
): string {
  let message: string;

  try {
    message = chrome.i18n.getMessage(key, substitutions);
  } catch (error) {
    log.warn("Failed to get localized message:", error);
    return key;
  }

  // In development, return the key if message is empty
  // This helps identify missing translations
  if (!message) {
    log.warn(`Missing translation for key: ${key}`);
    return key;
  }

  return message;
}
