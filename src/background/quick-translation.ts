import {
  createQuickTranslationRequest,
  getQuickTranslationStorageKey,
  QUICK_TRANSLATION_MENU_ID,
} from "@/shared/quick-translation";
import { createPrefixedLogger } from "@/shared/utils/logger";

const log = createPrefixedLogger("QuickTranslation");

export function registerQuickTranslationHandler(): void {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        log.error(
          "Failed to clear context menus:",
          chrome.runtime.lastError.message
        );
      }
      chrome.contextMenus.create({
        id: QUICK_TRANSLATION_MENU_ID,
        title:
          chrome.i18n.getMessage("quickTranslation_menu") ||
          "Flash Translate selected text",
        contexts: ["selection"],
      });
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== QUICK_TRANSLATION_MENU_ID || !tab) {
      return;
    }

    const request = createQuickTranslationRequest(
      tab,
      info.selectionText ?? ""
    );
    if (!request) {
      return;
    }

    const key = getQuickTranslationStorageKey(request.windowId);
    chrome.storage.session.set({ [key]: request }, () => {
      if (chrome.runtime.lastError) {
        log.error(
          "Failed to store quick translation:",
          chrome.runtime.lastError.message
        );
        return;
      }
      chrome.sidePanel
        .open({ tabId: request.tabId })
        .catch((error: unknown) => {
          log.error("Failed to open side panel:", error);
        });
    });
  });
}
