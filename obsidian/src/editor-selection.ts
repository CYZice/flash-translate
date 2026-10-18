interface SelectionEditor {
  getValue: () => string;
  getCursor: (which: "from" | "to") => { line: number; ch: number };
  posToOffset: (position: { line: number; ch: number }) => number;
}

interface ActiveNoteEditor {
  file: { path: string } | null;
  editor?: SelectionEditor;
}

export function readActiveSelection(
  editor: SelectionEditor,
  activeEditor: ActiveNoteEditor | null
): { path: string; document: string; start: number; end: number } {
  if (!activeEditor?.file || activeEditor.editor !== editor) {
    throw new Error(
      "The active note changed. Return to the original note and translate again."
    );
  }
  return {
    path: activeEditor.file.path,
    document: editor.getValue(),
    start: editor.posToOffset(editor.getCursor("from")),
    end: editor.posToOffset(editor.getCursor("to")),
  };
}
