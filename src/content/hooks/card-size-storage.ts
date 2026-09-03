const CARD_SIZE_STORAGE_KEY = "flash-translate-card-size";

export interface CardSize {
  width: number;
  height: number;
}

function isCardSize(value: unknown): value is CardSize {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const size = value as Record<string, unknown>;
  return (
    typeof size.width === "number" &&
    Number.isFinite(size.width) &&
    size.width > 0 &&
    typeof size.height === "number" &&
    Number.isFinite(size.height) &&
    size.height > 0
  );
}

function isExtensionContextAvailable(): boolean {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

export async function getSavedCardSize(): Promise<CardSize | null> {
  if (!isExtensionContextAvailable()) {
    return null;
  }

  try {
    const result = await chrome.storage.local.get([CARD_SIZE_STORAGE_KEY]);
    const size = result[CARD_SIZE_STORAGE_KEY];
    return isCardSize(size) ? size : null;
  } catch {
    return null;
  }
}

export async function saveCardSize(size: CardSize): Promise<void> {
  if (!isExtensionContextAvailable()) {
    return;
  }

  try {
    await chrome.storage.local.set({ [CARD_SIZE_STORAGE_KEY]: size });
  } catch {
    // Persisting a visual preference must not affect translation.
  }
}
