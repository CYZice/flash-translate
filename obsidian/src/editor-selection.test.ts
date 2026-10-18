import { describe, expect, it } from "vitest";
import { readActiveSelection } from "./editor-selection";
import { captureSelection, planTranslationEdit } from "./selection";

function createEditor(document = "Hello world.", start = 0, end = 5) {
  return {
    getValue: () => document,
    getCursor: (which: "from" | "to") => ({
      line: 0,
      ch: which === "from" ? start : end,
    }),
    posToOffset: (position: { line: number; ch: number }) => position.ch,
  };
}

describe("active note editor validation", () => {
  it("accepts file-backed embedded editors without a MarkdownView", () => {
    const editor = createEditor();
    const current = readActiveSelection(editor, {
      file: { path: "Canvas note.md" },
      editor,
    });
    const snapshot = captureSelection(
      "Hello world.",
      "Canvas note.md",
      0,
      5,
      0
    );
    for (const mode of ["replace", "insert"] as const) {
      expect(() =>
        planTranslationEdit(snapshot, current, "Bonjour", mode)
      ).not.toThrow();
    }
    expect(current).toEqual({
      path: "Canvas note.md",
      document: "Hello world.",
      start: 0,
      end: 5,
    });
  });

  it("rejects a different editor even when the file and contents match", () => {
    expect(() =>
      readActiveSelection(createEditor(), {
        file: { path: "Example.md" },
        editor: createEditor(),
      })
    ).toThrow("active note changed");
  });

  it("rejects missing active editors, files, and editor instances", () => {
    const editor = createEditor();
    for (const activeEditor of [
      null,
      { file: null, editor },
      { file: { path: "Example.md" } },
    ]) {
      expect(() => readActiveSelection(editor, activeEditor)).toThrow(
        "active note changed"
      );
    }
  });

  it.each([
    { path: "Other.md", document: "Hello world.", start: 0, end: 5 },
    { path: "Example.md", document: "Hello changed.", start: 0, end: 5 },
    { path: "Example.md", document: "Hello world.", start: 1, end: 5 },
    { path: "Example.md", document: "Hello world.", start: 0, end: 4 },
  ])("retains stale-edit checks: $path $document $start $end", (changed) => {
    const snapshot = captureSelection("Hello world.", "Example.md", 0, 5, 0);
    const editor = createEditor(changed.document, changed.start, changed.end);
    const current = readActiveSelection(editor, {
      file: { path: changed.path },
      editor,
    });
    for (const mode of ["replace", "insert"] as const) {
      expect(() =>
        planTranslationEdit(snapshot, current, "Bonjour", mode)
      ).toThrow("changed");
    }
  });
});
