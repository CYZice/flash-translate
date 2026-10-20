interface AnchorRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function visibleRect(rect: DOMRect | undefined): rect is DOMRect {
  return Boolean(
    rect &&
      rect.height > 0 &&
      Number.isFinite(rect.left) &&
      Number.isFinite(rect.top)
  );
}

/** Anchor to the moving end of the selection, not its multiline union box. */
export function getSelectionFocusRect(
  selection: Selection | null
): DOMRect | null {
  if (!selection?.rangeCount) {
    return null;
  }
  const focus = selection.focusNode;
  const range = selection.getRangeAt(selection.rangeCount - 1);
  const document = range.startContainer.ownerDocument;
  if (!document) {
    return null;
  }
  if (focus) {
    const caret = document.createRange();
    caret.setStart(focus, selection.focusOffset);
    caret.collapse(true);
    // A caret may have zero width, but its line height and x-position are valid.
    const rect = caret.getClientRects()[0] ?? caret.getBoundingClientRect();
    if (visibleRect(rect)) {
      return new DOMRect(rect.left, rect.top, 1, rect.height);
    }
  }
  // Element-boundary carets can have no box (e.g. selectNodeContents or math).
  // Read only the terminal rendered fragment, without allocating an array of boxes.
  const atStart =
    focus === range.startContainer &&
    selection.focusOffset === range.startOffset;
  return getRangeEdgeRect(range, atStart);
}

/** Returns the union of all rendered fragments in the selection. */
export function getSelectionBoundsRect(
  selection: Selection | null
): DOMRect | null {
  if (!selection?.rangeCount) {
    return null;
  }

  try {
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < selection.rangeCount; index++) {
      const range = selection.getRangeAt(index);
      const rect = range.getBoundingClientRect();
      const fragments =
        visibleRect(rect) && rect.width > 0
          ? [rect]
          : Array.from(range.getClientRects());
      for (const fragment of fragments) {
        if (!visibleRect(fragment) || fragment.width <= 0) {
          continue;
        }
        left = Math.min(left, fragment.left);
        top = Math.min(top, fragment.top);
        right = Math.max(right, fragment.right);
        bottom = Math.max(bottom, fragment.bottom);
      }
    }
    return Number.isFinite(left)
      ? new DOMRect(left, top, right - left, bottom - top)
      : null;
  } catch {
    return null;
  }
}

function getRangeEdgeRect(range: Range, atStart: boolean): DOMRect | null {
  const fragments = range.getClientRects();
  for (
    let index = atStart ? 0 : fragments.length - 1;
    index >= 0 && index < fragments.length;
    index += atStart ? 1 : -1
  ) {
    const rect = fragments[index];
    if (!visibleRect(rect) || rect.width <= 0) {
      continue;
    }
    const node = atStart ? range.startContainer : range.endContainer;
    const element =
      node.nodeType === 1 ? (node as Element) : node.parentElement;
    const rtl =
      element &&
      element.ownerDocument.defaultView?.getComputedStyle(element).direction ===
        "rtl";
    const x = atStart !== Boolean(rtl) ? rect.left : rect.right;
    return new DOMRect(x, rect.top, 1, rect.height);
  }
  return null;
}

export function positionSelectionBadge(
  anchor: AnchorRect,
  size: { width: number; height: number },
  viewport: { width: number; height: number }
): { x: number; y: number } {
  const gap = 6;
  const padding = 8;
  const below = anchor.bottom + gap;
  const preferredY =
    below + size.height <= viewport.height - padding
      ? below
      : anchor.top - size.height - gap;
  return {
    x: Math.max(
      padding,
      Math.min(anchor.right + gap, viewport.width - size.width - padding)
    ),
    y: Math.max(
      padding,
      Math.min(preferredY, viewport.height - size.height - padding)
    ),
  };
}
