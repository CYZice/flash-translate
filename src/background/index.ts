import { createPrefixedLogger } from "@/shared/utils/logger";
import { isAiTestConnectionMessage } from "@/shared/constants/ai-translation";
import {
  handleAiTestConnection,
  registerAiTranslationPortHandler,
} from "./ai-translation-handler";
import { handleRuntimeMessage } from "./runtime-message-handler";

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
