import type { HoveredTerm, ViewportRect } from "./hovered-term";
import {
  intlWordSegmentationStrategy,
  type TermSegmentationStrategy,
} from "./term-segmentation";

interface CaretLocation {
  node: Node;
  offset: number;
}

interface ResolveHoveredTermOptions {
  document: Document;
  x: number;
  y: number;
  selectionRanges: readonly Range[];
  contextText: string;
  sourceLanguage: string;
  segmentationStrategy?: TermSegmentationStrategy;
}

function getCaretLocation(
  document: Document,
  x: number,
  y: number
): CaretLocation | null {
  if (typeof document.caretPositionFromPoint === "function") {
    const position = document.caretPositionFromPoint(x, y);
    if (position) {
      return {
        node: position.offsetNode,
        offset: position.offset,
      };
    }
  }

  const range =
    typeof document.caretRangeFromPoint === "function"
      ? document.caretRangeFromPoint(x, y)
      : null;
  if (!range) {
    return null;
  }

  return {
    node: range.startContainer,
    offset: range.startOffset,
  };
}

function isPointInsideRect(rect: ViewportRect, x: number, y: number): boolean {
  return rect.left <= x && x <= rect.right && rect.top <= y && y <= rect.bottom;
}

export function isPointInsideSelectionRanges(
  selectionRanges: readonly Range[],
  x: number,
  y: number
): boolean {
  return selectionRanges.some((selectionRange) => {
    try {
      return Array.from(selectionRange.getClientRects()).some(
        (rect) =>
          rect.width > 0 && rect.height > 0 && isPointInsideRect(rect, x, y)
      );
    } catch {
      return false;
    }
  });
}

function isSegmentInsideSelection(
  node: Text,
  startOffset: number,
  endOffset: number,
  selectionRanges: readonly Range[]
): boolean {
  return selectionRanges.some((selectionRange) => {
    try {
      return (
        selectionRange.comparePoint(node, startOffset) === 0 &&
        selectionRange.comparePoint(node, endOffset) === 0
      );
    } catch {
      return false;
    }
  });
}

function getSegmentOffsetInSelection(
  node: Text,
  startOffset: number,
  endOffset: number,
  selectionRanges: readonly Range[],
  contextText: string,
  segmentText: string
): number | null {
  let precedingTextLength = 0;

  for (const selectionRange of selectionRanges) {
    try {
      const containsSegment =
        selectionRange.comparePoint(node, startOffset) === 0 &&
        selectionRange.comparePoint(node, endOffset) === 0;
      if (!containsSegment) {
        precedingTextLength += selectionRange.toString().length;
        continue;
      }

      const prefixRange = selectionRange.cloneRange();
      prefixRange.setEnd(node, startOffset);
      const offset = precedingTextLength + prefixRange.toString().length;
      if (
        contextText.slice(offset, offset + segmentText.length) === segmentText
      ) {
        return offset;
      }

      return contextText.indexOf(segmentText);
    } catch {
      return null;
    }
  }

  return null;
}

function getAnchorRect(
  document: Document,
  node: Text,
  startOffset: number,
  endOffset: number,
  x: number,
  y: number
): ViewportRect | null {
  const termRange = document.createRange();
  termRange.setStart(node, startOffset);
  termRange.setEnd(node, endOffset);

  for (const rect of termRange.getClientRects()) {
    if (isPointInsideRect(rect, x, y) && rect.width > 0 && rect.height > 0) {
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    }
  }

  return null;
}

export function resolveHoveredTermAtPoint({
  document,
  x,
  y,
  selectionRanges,
  contextText,
  sourceLanguage,
  segmentationStrategy = intlWordSegmentationStrategy,
}: ResolveHoveredTermOptions): HoveredTerm | null {
  const caret = getCaretLocation(document, x, y);
  if (!(caret?.node instanceof Text)) {
    return null;
  }

  const segment = segmentationStrategy.segmentAt({
    text: caret.node.data,
    offset: caret.offset,
    language: sourceLanguage,
  });
  if (!segment) {
    return null;
  }

  if (
    !isSegmentInsideSelection(
      caret.node,
      segment.startOffset,
      segment.endOffset,
      selectionRanges
    )
  ) {
    return null;
  }

  const termOffset = getSegmentOffsetInSelection(
    caret.node,
    segment.startOffset,
    segment.endOffset,
    selectionRanges,
    contextText,
    segment.text
  );
  if (termOffset === null || termOffset < 0) {
    return null;
  }

  const anchorRect = getAnchorRect(
    document,
    caret.node,
    segment.startOffset,
    segment.endOffset,
    x,
    y
  );
  if (!anchorRect) {
    return null;
  }

  return {
    sourceText: segment.text,
    contextText,
    termOffset,
    anchorRect,
  };
}
