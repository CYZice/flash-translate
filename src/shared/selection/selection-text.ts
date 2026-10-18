import { getAdjacentContext } from "../utils/ai-context";
import {
  getMathRoot,
  getMathText,
  isWholeMathSelected,
} from "./selection-math";

// Budgets apply only to optional context, never to the selected text itself.
export const MAX_SELECTION_CONTEXT_CHARACTERS = 8192;
const MAX_CONTEXT_NODES = 512;
const CONTEXT_CHUNK_SIZE = 256;
const SKIP_SELECTOR =
  "script,style,noscript,[hidden],annotation,annotation-xml,.katex-mathml,mjx-assistive-mml";
const BLOCK_DISPLAY = /^(block|list-item|table|table-row|flex|grid|flow-root)$/;

type Direction = "before" | "after";

interface TextStyle {
  display: string;
  visibility: string;
  whiteSpace: string;
}

export function normalizeSelectionText(text: string): string {
  return text
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getSibling(node: Node, direction: Direction): Node | null {
  return direction === "after" ? node.nextSibling : node.previousSibling;
}

function getChild(node: Node, direction: Direction): ChildNode | null {
  return direction === "after" ? node.firstChild : node.lastChild;
}

function getNextOutside(
  node: Node,
  root: Node,
  direction: Direction
): Node | null {
  let current: Node | null = node;
  while (current && current !== root) {
    const sibling = getSibling(current, direction);
    if (sibling) {
      return sibling;
    }
    current = current.parentNode;
  }
  return null;
}

function getStartingNode(range: Range, direction: Direction): Node | null {
  const container =
    direction === "after" ? range.startContainer : range.endContainer;
  const offset = direction === "after" ? range.startOffset : range.endOffset;
  const math = getMathRoot(container);
  if (math) {
    return math;
  }
  if (container.nodeType === 3) {
    return container;
  }
  const child =
    container.childNodes[direction === "after" ? offset : offset - 1];
  if (child) {
    return child;
  }
  let current: Node | null = container;
  while (current && current !== range.commonAncestorContainer) {
    const sibling = getSibling(current, direction);
    if (sibling) {
      return sibling;
    }
    current = current.parentNode;
  }
  return null;
}

function createTextStyles(document: Document | null) {
  const styles = new WeakMap<Element, TextStyle>();
  const styleOf = (element: Element): TextStyle => {
    let style = styles.get(element);
    if (!style) {
      const computed = document?.defaultView?.getComputedStyle(element);
      style = {
        display: computed?.display ?? "",
        visibility: computed?.visibility ?? "",
        whiteSpace: computed?.whiteSpace ?? "",
      };
      styles.set(element, style);
    }
    return style;
  };
  const separatorOf = (node: Node): string => {
    if (node.nodeType !== 1) {
      return "";
    }
    const display = styleOf(node as Element).display;
    if (display === "table-cell") {
      return " ";
    }
    return BLOCK_DISPLAY.test(display) ? "\n\n" : "";
  };
  const suppressedAncestor = (node: Node): Element | null => {
    let element = node.nodeType === 1 ? (node as Element) : node.parentElement;
    while (element) {
      if (
        element.matches(SKIP_SELECTOR) ||
        styleOf(element).display === "none"
      ) {
        return element;
      }
      element = element.parentElement;
    }
    return null;
  };
  return { styleOf, separatorOf, suppressedAncestor };
}

type TextStyles = ReturnType<typeof createTextStyles>;

function* readTextChunks(
  text: Text,
  range: Range,
  direction: Direction,
  contextOnly: boolean,
  whiteSpace: string
): Generator<string> {
  const start = text === range.startContainer ? range.startOffset : 0;
  const end = text === range.endContainer ? range.endOffset : text.length;
  const size = contextOnly ? CONTEXT_CHUNK_SIZE : Math.max(1, end - start);
  let offset = direction === "after" ? start : end;
  while (direction === "after" ? offset < end : offset > start) {
    const from =
      direction === "after" ? offset : Math.max(start, offset - size);
    const to = direction === "after" ? Math.min(end, offset + size) : offset;
    const part = text.substringData(from, to - from);
    yield whiteSpace.startsWith("pre") || whiteSpace === "break-spaces"
      ? part
      : part.replace(/\s+/g, " ");
    offset = direction === "after" ? to : from;
  }
}

/** The return value tells the walker whether to visit children. */
function* readNodeChunks(
  node: Node,
  range: Range,
  direction: Direction,
  contextOnly: boolean,
  styles: TextStyles
): Generator<string, boolean> {
  if (node.nodeType === 3) {
    const parent = node.parentElement;
    if (parent) {
      const style = styles.styleOf(parent);
      if (style.visibility !== "hidden" && style.visibility !== "collapse") {
        yield* readTextChunks(
          node as Text,
          range,
          direction,
          contextOnly,
          style.whiteSpace
        );
      }
    }
    return false;
  }
  if (node.nodeType !== 1) {
    return true;
  }
  const element = node as Element;
  const nodeLimit = contextOnly ? MAX_CONTEXT_NODES : Number.POSITIVE_INFINITY;
  const visibility = styles.styleOf(element).visibility;
  if (
    visibility !== "hidden" &&
    visibility !== "collapse" &&
    getMathRoot(element) === element &&
    isWholeMathSelected(range, element, nodeLimit)
  ) {
    yield getMathText(
      element,
      contextOnly ? MAX_SELECTION_CONTEXT_CHARACTERS : Number.POSITIVE_INFINITY,
      nodeLimit
    );
    return false;
  }
  if (element.localName === "svg") {
    return false;
  }
  if (element.localName === "br") {
    yield "\n";
  } else {
    const separator = styles.separatorOf(element);
    if (separator) {
      yield separator;
    }
  }
  return true;
}

function* leaveNode(
  node: Node,
  root: Node,
  direction: Direction,
  styles: TextStyles
): Generator<string, Node | null> {
  let current: Node | null = node;
  while (current) {
    const separator = styles.separatorOf(current);
    if (separator) {
      yield separator;
    }
    if (current === root) {
      return null;
    }
    const sibling = getSibling(current, direction);
    if (sibling) {
      return sibling;
    }
    current = current.parentNode;
  }
  return null;
}

/** Walk the original DOM by node, without clones or per-character objects. */
function* readRangeChunks(
  range: Range,
  direction: Direction,
  contextOnly: boolean
): Generator<string> {
  if (range.collapsed) {
    return;
  }
  const root =
    getMathRoot(range.commonAncestorContainer) ?? range.commonAncestorContainer;
  const styles = createTextStyles(root.ownerDocument);
  const limit = contextOnly ? MAX_CONTEXT_NODES : Number.POSITIVE_INFINITY;
  let current = getStartingNode(range, direction);
  let visited = 0;
  while (current && visited++ < limit) {
    if (!range.intersectsNode(current)) {
      const position = range.comparePoint(current, 0);
      if (direction === "after" ? position > 0 : position < 0) {
        break;
      }
      current = getNextOutside(current, root, direction);
      continue;
    }
    const suppressed = styles.suppressedAncestor(current);
    current = suppressed ?? current;
    const descend =
      !suppressed &&
      (yield* readNodeChunks(current, range, direction, contextOnly, styles));
    const child = descend ? getChild(current, direction) : null;
    current = child ?? (yield* leaveNode(current, root, direction, styles));
  }
}

export function getRangeText(range: Range): string {
  return normalizeSelectionText(
    Array.from(readRangeChunks(range, "after", false)).join("")
  );
}

export function getRangeContext(
  range: Range,
  direction: Direction,
  sentenceCount: number
): string {
  if (sentenceCount === 0) {
    return "";
  }
  let text = "";
  for (const chunk of readRangeChunks(range, direction, true)) {
    const remaining = MAX_SELECTION_CONTEXT_CHARACTERS - text.length;
    const part =
      direction === "after"
        ? chunk.slice(0, remaining)
        : chunk.slice(-remaining);
    text = direction === "after" ? text + part : part + text;
    // Read one extra boundary so closing quotes and incomplete fragments are safe.
    if (
      text.length >= MAX_SELECTION_CONTEXT_CHARACTERS ||
      hasEnoughContext(text, sentenceCount)
    ) {
      break;
    }
  }
  return getAdjacentContext(text, direction, sentenceCount);
}

function hasEnoughContext(text: string, count: number): boolean {
  let boundaries = 0;
  for (const _match of text.matchAll(/[.!?。！？]+/g)) {
    if (++boundaries > count) {
      return true;
    }
  }
  return false;
}
