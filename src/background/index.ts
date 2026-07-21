import { createPrefixedLogger } from "@/shared/utils/logger";
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
