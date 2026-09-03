// Pure functions for text selection logic
// These are extracted from useTextSelection hook for testability

interface RectLike {
  width: number;
  height: number;
}

export interface SelectionInfo {
  text: string;
  rect: DOMRect;
  ranges: readonly Range[];
  contextBefore: string;
  contextAfter: string;
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

function normalizeContextText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const NON_VISIBLE_SELECTION_SELECTOR = [
  "script",
  "style",
  "noscript",
  "annotation[encoding='application/x-tex']",
  "mjx-assistive-mml",
  ".katex-mathml",
  "[aria-hidden='true']",
  "[hidden]",
  "mjx-container svg",
  ".katex svg",
].join(",");

function normalizeSelectionText(text: string): string {
  return text
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getRangeText(range: Range): string {
  const container = document.createElement("div");
  container.append(range.cloneContents());
  for (const element of container.querySelectorAll(
    NON_VISIBLE_SELECTION_SELECTOR
  )) {
    element.remove();
  }
  return normalizeSelectionText(container.textContent ?? "");
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
  return getValidSelectionText(normalized || selection.toString());
}

const SENTENCE_END_REGEX =
  /[.!?\u3002\uff01\uff1f]+(?:["'\u201d\u2019\uff09\]]*)/g;

function getAdjacentSentence(
  text: string,
  direction: "before" | "after"
): string {
  const normalized = normalizeContextText(text);
  if (!normalized) {
    return "";
  }

  if (direction === "after") {
    const match = SENTENCE_END_REGEX.exec(normalized);
    return (
      match ? normalized.slice(0, match.index + match[0].length) : normalized
    ).trim();
  }

  let sentenceStart = 0;
  for (const match of normalized.matchAll(SENTENCE_END_REGEX)) {
    sentenceStart = match.index + match[0].length;
  }
  return normalized.slice(sentenceStart).trim();
}

function getTextBeforeRange(range: Range): string {
  const container = getContextContainer(range.startContainer);
  if (!container) {
    return "";
  }

  try {
    const contextRange = document.createRange();
    contextRange.selectNodeContents(container);
    contextRange.setEnd(range.startContainer, range.startOffset);
    return getAdjacentSentence(getRangeText(contextRange), "before");
  } catch {
    return "";
  }
}

function getTextAfterRange(range: Range): string {
  const container = getContextContainer(range.endContainer);
  if (!container) {
    return "";
  }

  try {
    const contextRange = document.createRange();
    contextRange.selectNodeContents(container);
    contextRange.setStart(range.endContainer, range.endOffset);
    return getAdjacentSentence(getRangeText(contextRange), "after");
  } catch {
    return "";
  }
}

export function getSelectionContext(selection: Selection | null): {
  contextBefore: string;
  contextAfter: string;
} {
  if (!selection || selection.rangeCount === 0) {
    return { contextBefore: "", contextAfter: "" };
  }

  try {
    const firstRange = selection.getRangeAt(0);
    const lastRange = selection.getRangeAt(selection.rangeCount - 1);
    return {
      contextBefore: getTextBeforeRange(firstRange),
      contextAfter: getTextAfterRange(lastRange),
    };
  } catch {
    return { contextBefore: "", contextAfter: "" };
  }
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
