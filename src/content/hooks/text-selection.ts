// Pure functions for text selection logic
// These are extracted from useTextSelection hook for testability

interface RectLike {
  width: number;
  height: number;
}

export interface SelectionInfo {
  text: string;
  rect: DOMRect;
}

/**
 * Validates and normalizes selected text.
 * Returns trimmed text if valid, null otherwise.
 */
export function getValidSelectionText(
  text: string | undefined | null
): string | null {
  if (!text) {
    return null;
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
}

/**
 * Validates if the selection rectangle has valid dimensions
 */
export function isValidRect<T extends RectLike>(
  rect: T | undefined | null
): rect is T {
  if (!rect) {
    return false;
  }
  return rect.width > 0 && rect.height > 0;
}

/**
 * Gets the bounding rectangle for a selection.
 * Returns null if the selection has no valid range or rect.
 */
export function getSelectionRect(
  selection: Selection | null,
  fallbackRect: DOMRect
): DOMRect | null {
  if (!selection) {
    return null;
  }

  try {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (isValidRect(rect)) {
      return rect;
    }
    return null;
  } catch {
    // Fallback to provided rect if range fails
    return fallbackRect;
  }
}

/**
 * Determines if the card should be shown for a new selection
 * Returns true if the text is different from the last selection
 */
export function shouldShowCardForSelection(
  currentText: string,
  lastText: string | null
): boolean {
  return currentText !== lastText;
}

/**
 * Checks if a click event originated from inside the shadow DOM host
 */
export function isClickInsideShadowHost(
  eventPath: EventTarget[],
  hostId: string
): boolean {
  return eventPath.some((el) => el instanceof HTMLElement && el.id === hostId);
}

/**
 * Checks if a node is inside a contenteditable element.
 * Returns true if the node or any of its ancestors has contenteditable="true".
 */
export function isNodeInContentEditable(node: Node | null): boolean {
  if (!node) {
    return false;
  }

  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement) {
      // Check for contenteditable attribute
      const contentEditable = current.getAttribute("contenteditable");
      if (contentEditable === "true" || contentEditable === "") {
        return true;
      }
      // If explicitly set to false, stop checking ancestors
      if (contentEditable === "false") {
        return false;
      }
    }
    current = current.parentNode;
  }

  return false;
}
