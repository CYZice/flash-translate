// Pure functions for text selection logic
// These are extracted from useTextSelection hook for testability

import {
  DEFAULT_AI_CONTEXT_SENTENCE_COUNT,
  normalizeAiContextSentenceCount,
} from "@/shared/utils/ai-context";
import {
  getRangeContext,
  getRangeText,
  normalizeSelectionText,
} from "./selection-text";
import type { TranslationContext } from "./translator-executor";

interface RectLike {
  width: number;
  height: number;
}

export interface SelectionInfo {
  text: string;
  rect: DOMRect;
  ranges: readonly Range[];
  readContext: () => TranslationContext;
}

const CONTEXT_CONTAINER_SELECTOR =
  "p,li,td,th,blockquote,pre,div,section,article,main";

function getContextContainer(node: Node): Element | null {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  return element?.closest(CONTEXT_CONTAINER_SELECTOR) ?? element;
}

export function getSelectionText(selection: Selection | null): string | null {
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const parts: string[] = [];
  try {
    for (let index = 0; index < selection.rangeCount; index += 1) {
      const text = getRangeText(selection.getRangeAt(index));
      if (text) {
        parts.push(text);
      }
    }
  } catch {
    return getValidSelectionText(selection.toString());
  }

  const normalized = normalizeSelectionText(parts.join("\n"));
  return getValidSelectionText(normalized);
}

function getTextBeforeRange(range: Range, sentenceCount: number): string {
  const container = getContextContainer(range.startContainer);
  if (!container) {
    return "";
  }

  try {
    const contextRange = document.createRange();
    contextRange.selectNodeContents(container);
    contextRange.setEnd(range.startContainer, range.startOffset);
    return getRangeContext(contextRange, "before", sentenceCount);
  } catch {
    return "";
  }
}

function getTextAfterRange(range: Range, sentenceCount: number): string {
  const container = getContextContainer(range.endContainer);
  if (!container) {
    return "";
  }

  try {
    const contextRange = document.createRange();
    contextRange.selectNodeContents(container);
    contextRange.setStart(range.endContainer, range.endOffset);
    return getRangeContext(contextRange, "after", sentenceCount);
  } catch {
    return "";
  }
}

export function getSelectionContext(
  selection: Selection | null,
  sentenceCount = DEFAULT_AI_CONTEXT_SENTENCE_COUNT
): {
  contextBefore: string;
  contextAfter: string;
} {
  if (!selection || selection.rangeCount === 0 || sentenceCount === 0) {
    return { contextBefore: "", contextAfter: "" };
  }

  return getRangesContext(cloneSelectionRanges(selection), sentenceCount);
}

export function getRangesContext(
  ranges: readonly Range[],
  sentenceCount: number
): TranslationContext {
  const count = normalizeAiContextSentenceCount(sentenceCount);
  const firstRange = ranges[0];
  const lastRange = ranges.at(-1);
  if (!(firstRange && lastRange) || count === 0) {
    return { contextBefore: "", contextAfter: "" };
  }
  if (
    !(
      firstRange.startContainer.isConnected &&
      lastRange.endContainer.isConnected
    )
  ) {
    return { contextBefore: "", contextAfter: "" };
  }
  return {
    contextBefore: getTextBeforeRange(firstRange, count),
    contextAfter: getTextAfterRange(lastRange, count),
  };
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
    const clientRects = Array.from(range.getClientRects()).filter(isValidRect);
    if (clientRects.length > 0) {
      const left = Math.min(...clientRects.map((item) => item.left));
      const top = Math.min(...clientRects.map((item) => item.top));
      const right = Math.max(...clientRects.map((item) => item.right));
      const bottom = Math.max(...clientRects.map((item) => item.bottom));
      return new DOMRect(left, top, right - left, bottom - top);
    }
    return null;
  } catch {
    // Fallback to provided rect if range fails
    return fallbackRect;
  }
}

export function cloneSelectionRanges(selection: Selection | null): Range[] {
  if (!selection) {
    return [];
  }

  const ranges: Range[] = [];
  for (let index = 0; index < selection.rangeCount; index += 1) {
    try {
      ranges.push(selection.getRangeAt(index).cloneRange());
    } catch {
      return ranges;
    }
  }
  return ranges;
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
 * A click outside the card should close it when the page keeps the original
 * selection active, such as when navigating inside a single-page application.
 */
export function shouldClearSelectionAfterOutsideInteraction(
  currentText: string | null,
  textAtPointerDown: string | null
): boolean {
  return currentText !== null && currentText === textAtPointerDown;
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
