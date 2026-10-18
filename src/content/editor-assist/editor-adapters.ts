import { measureTextControlOffset } from "@/shared/selection/text-control-geometry";
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
    return measureTextControlOffset(editor, textOffset);
  }
  return readContentEditableTextOffsetRect(editor, textOffset);
}

export function refreshEditorAnchor(
  snapshot: EditorSnapshot,
  textOffset: number
): RectLike | null {
  return measureEditorTextOffset(snapshot.editor, textOffset);
}
