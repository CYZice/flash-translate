/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { measureEditorTextOffset, readEditorSnapshot } from "./editor-adapters";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("editor adapters", () => {
  it("clears measured text immediately while reusing an empty mirror", () => {
    const editor = document.createElement("textarea");
    editor.value = `${"Synthetic editor text. ".repeat(1000)}中文`;
    document.body.append(editor);
    expect(
      measureEditorTextOffset(editor, editor.value.length - 2)
    ).not.toBeNull();
    const mirror = document.querySelector('[aria-hidden="true"]');
    expect(mirror).not.toBeNull();
    expect(mirror?.textContent).toBe("");
    expect(mirror?.childNodes.length).toBe(0);
    measureEditorTextOffset(editor, editor.value.length);
    expect(document.querySelector('[aria-hidden="true"]')).toBe(mirror);
    editor.remove();
    expect(mirror?.textContent).toBe("");
  });

  it("clears the mirror even when layout measurement fails", () => {
    const editor = document.createElement("textarea");
    editor.value = "Private draft 中文";
    document.body.append(editor);
    vi.spyOn(editor, "getBoundingClientRect").mockImplementation(() => {
      throw new Error("Layout unavailable");
    });
    expect(measureEditorTextOffset(editor, editor.value.length)).toBeNull();
    expect(document.querySelector('[aria-hidden="true"]')?.textContent).toBe(
      ""
    );
  });

  it("reads a contenteditable snapshot without relying on a caret rectangle", () => {
    const editor = document.createElement("div");
    editor.contentEditable = "true";
    editor.textContent = "你好";
    document.body.appendChild(editor);

    const textNode = editor.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 2);
    range.collapse(true);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(
      readEditorSnapshot(editor, {
        editor,
        id: "editor-1",
        kind: "contenteditable",
        revision: 1,
      })
    ).toMatchObject({
      caretOffset: 2,
      text: "你好",
    });

    editor.remove();
  });
});
