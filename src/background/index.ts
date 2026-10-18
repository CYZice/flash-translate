import { isAiTestConnectionMessage } from "@/shared/constants/ai-translation";
import { LOCAL_TRANSLATION_COMPLETED } from "@/shared/storage/usage";
import { createPrefixedLogger } from "@/shared/utils/logger";
import {
  handleAiTestConnection,
  registerAiTranslationPortHandler,
} from "./ai-translation-handler";
import { registerQuickTranslationHandler } from "./quick-translation";
import { handleRuntimeMessage } from "./runtime-message-handler";
import { recordUsage } from "./usage-store";

const log = createPrefixedLogger("Background");

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Extension installed
  }
});

chrome.runtime.onMessage.addListener((message) => {
  handleRuntimeMessage(message, {
    onError: (error) => log.error("Failed to open options page:", error),
    openOptionsPage: () => chrome.runtime.openOptionsPage(),
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isAiTestConnectionMessage(message)) {
    return false;
  }
  handleAiTestConnection().then(sendResponse);
  return true;
});

registerAiTranslationPortHandler();
registerQuickTranslationHandler();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (
    sender.id !== chrome.runtime.id ||
    message?.type !== LOCAL_TRANSLATION_COMPLETED
  ) {
    return false;
  }
  recordUsage({ type: "completed" }).then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false })
  );
  return true;
});
