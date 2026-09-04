export interface RectLike {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
  x: number;
  y: number;
}

export type EditorKind = "contenteditable" | "text-control";

export interface EditorSession {
  editor: HTMLElement;
  id: string;
  kind: EditorKind;
  revision: number;
}

export interface EditorSnapshot {
  caretOffset: number;
  editor: HTMLElement;
  kind: EditorKind;
  revision: number;
  sessionId: string;
  text: string;
}
