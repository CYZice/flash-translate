import {
  buildContentTextModel,
  domPositionToTextOffset,
  textRangeToDomRange,
} from "./contenteditable-text-model";
import { findEditableFromEvent, isSensitiveEditor } from "./editable-detector";
import type { EditorSession, EditorSnapshot, RectLike } from "./types";

function rectLike(rect: DOMRect): RectLike {
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
    x: rect.x,
    y: rect.y,
  };
}

const mirrorByDocument = new WeakMap<Document, HTMLDivElement>();

function getMirror(document: Document): HTMLDivElement {
  const existing = mirrorByDocument.get(document);
  if (existing?.isConnected) {
    return existing;
  }

  const mirror = document.createElement("div");
  mirror.setAttribute("aria-hidden", "true");
  Object.assign(mirror.style, {
    position: "absolute",
    left: "-100000px",
    top: "0",
    visibility: "hidden",
    pointerEvents: "none",
    whiteSpace: "pre-wrap",
  });
  document.body.appendChild(mirror);
  mirrorByDocument.set(document, mirror);
  return mirror;
}

function readNativeTextOffsetRect(
  editor: HTMLInputElement | HTMLTextAreaElement,
  textOffset: number
): RectLike | null {
  try {
    const mirror = getMirror(editor.ownerDocument);
    const styles = getComputedStyle(editor);
    const properties = [
      "boxSizing",
      "fontFamily",
      "fontSize",
      "fontStyle",
      "fontWeight",
      "letterSpacing",
      "lineHeight",
      "paddingBottom",
      "paddingLeft",
      "paddingRight",
      "paddingTop",
      "textAlign",
      "textIndent",
      "textTransform",
      "wordSpacing",
      "borderBottomWidth",
      "borderLeftWidth",
      "borderRightWidth",
      "borderTopWidth",
    ] as const;
    for (const property of properties) {
      mirror.style[property] = styles[property];
    }
    mirror.style.width = `${editor.clientWidth}px`;
    mirror.style.whiteSpace =
      editor instanceof HTMLTextAreaElement ? "pre-wrap" : "pre";
    mirror.style.overflowWrap =
      editor instanceof HTMLTextAreaElement ? "break-word" : "normal";
    mirror.textContent = "";

    const before = editor.value.slice(0, textOffset);
    const marker = editor.ownerDocument.createElement("span");
    marker.textContent = "\u200b";
    mirror.append(editor.ownerDocument.createTextNode(before), marker);

    const mirrorRect = mirror.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    return rectLike(
      new DOMRect(
        editorRect.left + markerRect.left - mirrorRect.left - editor.scrollLeft,
        editorRect.top + markerRect.top - mirrorRect.top - editor.scrollTop,
        1,
        markerRect.height || Number.parseFloat(styles.lineHeight) || 16
      )
    );
  } catch {
    return null;
  }
}

function readRangeRect(range: Range): RectLike | null {
  const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
  return rect.width || rect.height ? rectLike(rect) : null;
}

function readContentEditableTextOffsetRect(
  editor: HTMLElement,
  textOffset: number
): RectLike | null {
  const model = buildContentTextModel(editor);
  const start = Math.max(0, Math.min(textOffset, model.text.length));
  const end = Math.min(model.text.length, start + 1);
  if (end <= start) {
    return null;
  }
  const range = textRangeToDomRange(model, start, end);
  return range ? readRangeRect(range) : null;
}

export function readEditorSnapshot(
  editor: HTMLElement,
  session: EditorSession
): EditorSnapshot | null {
  if (isSensitiveEditor(editor) || !editor.isConnected) {
    return null;
  }

  if (
    editor instanceof HTMLInputElement ||
    editor instanceof HTMLTextAreaElement
  ) {
    const text = editor.value;
    const caretOffset = editor.selectionStart ?? text.length;
    return {
      caretOffset,
      editor,
      kind: "text-control",
      revision: session.revision,
      sessionId: session.id,
      text,
    };
  }

  const root = editor.getRootNode();
  const shadowSelection =
    root instanceof ShadowRoot
      ? (
          root as ShadowRoot & { getSelection?: () => Selection | null }
        ).getSelection?.()
      : null;
  const selection =
    shadowSelection ?? editor.ownerDocument.defaultView?.getSelection() ?? null;
  if (
    !(
      selection?.rangeCount &&
      selection.anchorNode &&
      editor.contains(selection.anchorNode)
    )
  ) {
    return null;
  }
  const model = buildContentTextModel(editor);
  const caretOffset = domPositionToTextOffset(
    model,
    selection.anchorNode,
    selection.anchorOffset
  );

  return {
    caretOffset,
    editor,
    kind: "contenteditable",
    revision: session.revision,
    sessionId: session.id,
    text: model.text,
  };
}

export function editorFromEvent(event: Event): HTMLElement | null {
  return findEditableFromEvent(event);
}

export function measureEditorTextOffset(
  editor: HTMLElement,
  textOffset: number
): RectLike | null {
  if (!editor.isConnected || isSensitiveEditor(editor)) {
    return null;
  }
  if (
    editor instanceof HTMLInputElement ||
    editor instanceof HTMLTextAreaElement
  ) {
    return readNativeTextOffsetRect(editor, textOffset);
  }
  return readContentEditableTextOffsetRect(editor, textOffset);
}

export function refreshEditorAnchor(
  snapshot: EditorSnapshot,
  textOffset: number
): RectLike | null {
  return measureEditorTextOffset(snapshot.editor, textOffset);
}
