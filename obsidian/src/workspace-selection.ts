import type { Editor } from "obsidian";
import { getSelectionFocusRect } from "../../src/shared/selection/selection-geometry";
import {
  getRangeContext,
  getRangeText,
  MAX_SELECTION_CONTEXT_CHARACTERS,
} from "../../src/shared/selection/selection-text";
import { getTextControlFocusRect } from "../../src/shared/selection/text-control-geometry";
import { getContextAroundSelection } from "../../src/shared/utils/ai-context";
import type { SelectionRect } from "./floating-position";

export interface SelectedSource {
  document: Document;
  text: string;
  rect: SelectionRect;
  note?: { editor: Editor; path: string; start: number; end: number };
  readContext: (sentences: number) => {
    contextBefore: string;
    contextAfter: string;
  };
}

export interface ActiveEditor {
  editor?: Editor;
  file: { path: string } | null;
}

const EXCLUDED =
  "[data-flash-translate-ui],.modal-container,.prompt,.vertical-tab-content-container";
const CONTEXT_CONTAINER = "p,li,td,th,blockquote,pre,div,section,article,main";

function elementOf(node: Node): Element | null {
  return node.nodeType === 1 ? (node as Element) : node.parentElement;
}

export function isTranslationUI(node: Node | null): boolean {
  return Boolean(node && elementOf(node)?.closest("[data-flash-translate-ui]"));
}

function controlSelection(
  document: Document,
  contains: (node: Node) => boolean
): SelectedSource | null {
  const element = document.activeElement;
  if (
    !(element && ["TEXTAREA", "INPUT"].includes(element.tagName)) ||
    element.closest(EXCLUDED) ||
    !contains(element)
  ) {
    return null;
  }
  const control = element as HTMLInputElement | HTMLTextAreaElement;
  if (control.type === "password") {
    return null;
  }
  const start = control.selectionStart ?? 0;
  const end = control.selectionEnd ?? 0;
  const text = control.value.slice(start, end).trim();
  if (!text) {
    return null;
  }
  return {
    document,
    text,
    rect: getTextControlFocusRect(control),
    readContext: (sentences) => {
      if (
        !(sentences && control.isConnected) ||
        control.value.slice(start, end).trim() !== text
      ) {
        return { contextBefore: "", contextAfter: "" };
      }
      return getContextAroundSelection(
        control.value.slice(
          Math.max(0, start - MAX_SELECTION_CONTEXT_CHARACTERS),
          start
        ),
        control.value.slice(end, end + MAX_SELECTION_CONTEXT_CHARACTERS),
        sentences
      );
    },
  };
}

function editorSelection(
  document: Document,
  active: ActiveEditor | null,
  rect: SelectionRect,
  range: Range | null
): SelectedSource | null {
  const editor = active?.editor;
  const focused = document.activeElement;
  if (
    !(
      editor &&
      active?.file &&
      editor.hasFocus() &&
      focused?.closest(".cm-editor")
    )
  ) {
    return null;
  }
  const container = focused.closest(".cm-editor");
  if (
    range &&
    !(
      container?.contains(range.startContainer) &&
      container.contains(range.endContainer)
    )
  ) {
    return null;
  }
  const text = editor.getSelection();
  if (!text.trim()) {
    return null;
  }
  return {
    document,
    text,
    rect,
    note: {
      editor,
      path: active.file.path,
      start: editor.posToOffset(editor.getCursor("from")),
      end: editor.posToOffset(editor.getCursor("to")),
    },
    // Editable note context is captured with the full stale-edit snapshot at activation.
    readContext: () => ({ contextBefore: "", contextAfter: "" }),
  };
}

function contextForRange(
  range: Range,
  before: boolean,
  sentences: number
): string {
  const node = before ? range.startContainer : range.endContainer;
  if (!(sentences && node.isConnected)) {
    return "";
  }
  const container = elementOf(node)?.closest(CONTEXT_CONTAINER);
  if (!container) {
    return "";
  }
  const context = range.cloneRange();
  context.selectNodeContents(container);
  if (before) {
    context.setEnd(range.startContainer, range.startOffset);
  } else {
    context.setStart(range.endContainer, range.endOffset);
  }
  return getRangeContext(context, before ? "before" : "after", sentences);
}

export function readWorkspaceSelection(
  document: Document,
  active: ActiveEditor | null,
  contains: (node: Node) => boolean
): SelectedSource | null {
  if (document.activeElement?.closest(`${EXCLUDED},input[type="password"]`)) {
    return null;
  }
  if (document.activeElement?.matches("textarea,input")) {
    return controlSelection(document, contains);
  }
  const selection = document.getSelection();
  const first = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const rect =
    getSelectionFocusRect(selection) ?? first?.getBoundingClientRect();
  const focused = document.activeElement;
  const fallback =
    focused && contains(focused) ? focused.getBoundingClientRect() : null;
  const anchor = rect && rect.width > 0 && rect.height > 0 ? rect : fallback;
  if (anchor && focused && contains(focused)) {
    const note = editorSelection(document, active, anchor, first);
    if (note) {
      return note;
    }
  }
  if (!(selection && first && rect?.width && rect.height)) {
    return null;
  }
  const ranges: Range[] = [];
  const parts: string[] = [];
  for (let index = 0; index < selection.rangeCount; index++) {
    const range = selection.getRangeAt(index);
    if (
      !(contains(range.startContainer) && contains(range.endContainer)) ||
      elementOf(range.startContainer)?.closest(EXCLUDED) ||
      elementOf(range.endContainer)?.closest(EXCLUDED)
    ) {
      return null;
    }
    ranges.push(range.cloneRange());
    parts.push(getRangeText(range));
  }
  const text = parts.filter(Boolean).join("\n");
  if (!text) {
    return null;
  }
  return {
    document,
    text,
    rect,
    readContext: (sentences) => ({
      contextBefore: contextForRange(ranges[0], true, sentences),
      contextAfter: contextForRange(ranges.at(-1) as Range, false, sentences),
    }),
  };
}
