export interface QuickTranslationRequest {
  requestId: string;
  tabId: number;
  windowId: number;
  text: string;
  source: "context-menu";
  sourceUrl?: string;
  createdAt: number;
}

export const QUICK_TRANSLATION_MENU_ID = "flash-translate-selection";
export const QUICK_TRANSLATION_TTL_MS = 5 * 60 * 1000;

export function getQuickTranslationStorageKey(windowId: number): string {
  return `flash-translate:quick-translation:${windowId}`;
}

export function normalizeQuickTranslationText(
  text: string | undefined
): string | null {
  const normalized = text?.trim();
  return normalized ? normalized : null;
}

export function isQuickTranslationRequest(
  value: unknown
): value is QuickTranslationRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const request = value as Partial<QuickTranslationRequest>;
  return (
    typeof request.requestId === "string" &&
    typeof request.tabId === "number" &&
    typeof request.windowId === "number" &&
    typeof request.text === "string" &&
    request.source === "context-menu" &&
    typeof request.createdAt === "number"
  );
}

export function isQuickTranslationRequestFresh(
  request: QuickTranslationRequest,
  now = Date.now()
): boolean {
  return now - request.createdAt <= QUICK_TRANSLATION_TTL_MS;
}

export function createQuickTranslationRequest(
  tab: chrome.tabs.Tab,
  text: string
): QuickTranslationRequest | null {
  const normalizedText = normalizeQuickTranslationText(text);
  if (tab.id === undefined || tab.windowId === undefined || !normalizedText) {
    return null;
  }

  return {
    requestId: `${Date.now()}-${crypto.randomUUID()}`,
    tabId: tab.id,
    windowId: tab.windowId,
    text: normalizedText,
    source: "context-menu",
    sourceUrl: tab.url,
    createdAt: Date.now(),
  };
}
