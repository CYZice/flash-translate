/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { readEditorSnapshot } from "./editor-adapters";

describe("editor adapters", () => {
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
