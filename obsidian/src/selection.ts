import { getContextAroundSelection } from "../../src/shared/utils/ai-context";

export interface NoteSelection {
  path: string;
  document: string;
  start: number;
  end: number;
  text: string;
  contextBefore: string;
  contextAfter: string;
}

export function captureSelection(
  document: string,
  path: string,
  anchor: number,
  head: number,
  contextSentenceCount: number
): NoteSelection {
  const start = Math.min(anchor, head);
  const end = Math.max(anchor, head);
  if (
    !path ||
    start < 0 ||
    end > document.length ||
    !document.slice(start, end).trim()
  ) {
    throw new Error("Select some note text to translate first.");
  }
  return {
    path,
    document,
    start,
    end,
    text: document.slice(start, end),
    ...getContextAroundSelection(
      document.slice(0, start),
      document.slice(end),
      contextSentenceCount
    ),
  };
}

export function planTranslationEdit(
  snapshot: NoteSelection,
  current: { path: string; document: string; start: number; end: number },
  translation: string,
  mode: "replace" | "insert"
): { from: number; to: number; text: string } {
  if (
    snapshot.path !== current.path ||
    snapshot.document !== current.document ||
    snapshot.start !== current.start ||
    snapshot.end !== current.end
  ) {
    throw new Error(
      "The note or selection changed. Translate the selection again before inserting."
    );
  }
  if (!translation.trim()) {
    throw new Error("There is no translation to insert.");
  }
  return mode === "replace"
    ? { from: snapshot.start, to: snapshot.end, text: translation }
    : { from: snapshot.end, to: snapshot.end, text: `\n\n${translation}` };
}
