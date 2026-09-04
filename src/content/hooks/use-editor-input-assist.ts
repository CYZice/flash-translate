import { useEffect, useRef, useState } from "react";
import { AnchorTracker } from "../editor-assist/anchor-tracker";
import { isSensitiveEditor } from "../editor-assist/editable-detector";
import {
  editorFromEvent,
  measureEditorTextOffset,
  readEditorSnapshot,
  refreshEditorAnchor,
} from "../editor-assist/editor-adapters";
import { resolveCjkSlice } from "../editor-assist/text-slice-resolver";
import type {
  EditorSession,
  EditorSnapshot,
  RectLike,
} from "../editor-assist/types";
import { useTranslator } from "./use-translator";

const INPUT_DEBOUNCE_MS = 400;

interface AssistState {
  anchorRect: RectLike;
  sessionId: string;
  revision: number;
}

type DiagnosticCode =
  | "caret-unmappable"
  | "editor-detached"
  | "empty-editor"
  | "mirror-measure-failed"
  | "no-cjk-content"
  | "sensitive-editor"
  | "slice-anchor-unmappable"
  | "stale-revision"
  | "translation-failed"
  | "unsupported-editor";

function logDiagnostic(code: DiagnosticCode, snapshot?: EditorSnapshot): void {
  console.debug(`[flash-translate][input-assist][${code}]`, {
    code,
    revision: snapshot?.revision,
    sessionId: snapshot?.sessionId,
  });
}

function logInputSnapshot(snapshot: EditorSnapshot): void {
  console.info("[flash-translate][input-assist] input", {
    caretOffset: snapshot.caretOffset,
    editorKind: snapshot.kind,
    revision: snapshot.revision,
    sessionId: snapshot.sessionId,
    textLength: snapshot.text.length,
  });
}

function makeSessionId(): string {
  return `editor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useEditorInputAssist(
  enabled: boolean,
  sourceLanguage: string,
  targetLanguage: string
) {
  const [assist, setAssist] = useState<AssistState | null>(null);
  const [anchorRect, setAnchorRect] = useState<RectLike | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composingRef = useRef(false);
  const sessionRef = useRef<EditorSession | null>(null);
  const snapshotRef = useRef<EditorSnapshot | null>(null);
  const anchorTrackerRef = useRef(new AnchorTracker());
  const translation = useTranslator({
    sourceLanguage: targetLanguage,
    targetLanguage: sourceLanguage,
    provider: "chrome-built-in",
    resetKey: `${targetLanguage}\u0000${sourceLanguage}`,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    console.info("[flash-translate][input-assist] enabled", {
      sourceLanguage: targetLanguage,
      targetLanguage: sourceLanguage,
    });
  }, [enabled, sourceLanguage, targetLanguage]);

  useEffect(() => {
    if (!enabled) {
      setAssist(null);
      setAnchorRect(null);
      snapshotRef.current = null;
      sessionRef.current = null;
      anchorTrackerRef.current.stop();
      translation.reset();
      return;
    }

    const clearAssist = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = null;
      setAssist(null);
      setAnchorRect(null);
      snapshotRef.current = null;
      anchorTrackerRef.current.stop();
      translation.reset();
    };

    const getOrCreateSession = (editor: HTMLElement): EditorSession => {
      const current = sessionRef.current;
      if (current?.editor === editor && editor.isConnected) {
        return current;
      }
      const kind =
        editor instanceof HTMLInputElement ||
        editor instanceof HTMLTextAreaElement
          ? "text-control"
          : "contenteditable";
      const next = {
        editor,
        id: makeSessionId(),
        kind,
        revision: 0,
      } satisfies EditorSession;
      sessionRef.current = next;
      return next;
    };

    const readCurrentSnapshot = (event: Event): EditorSnapshot | null => {
      const editor = editorFromEvent(event);
      if (!editor) {
        logDiagnostic("unsupported-editor");
        return null;
      }
      if (isSensitiveEditor(editor)) {
        logDiagnostic("sensitive-editor");
        return null;
      }
      const session = getOrCreateSession(editor);
      session.revision += 1;
      const snapshot = readEditorSnapshot(editor, session);
      if (!snapshot) {
        logDiagnostic(
          editor.isConnected ? "caret-unmappable" : "editor-detached"
        );
        return null;
      }
      snapshotRef.current = snapshot;
      logInputSnapshot(snapshot);
      return snapshot;
    };

    const schedule = (event: Event) => {
      if (composingRef.current) {
        return;
      }
      const snapshot = readCurrentSnapshot(event);
      if (!snapshot) {
        clearAssist();
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setAssist(null);
      setAnchorRect(null);
      anchorTrackerRef.current.stop();
      translation.reset();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const current = snapshotRef.current;
        if (
          !current ||
          current.sessionId !== snapshot.sessionId ||
          current.revision !== snapshot.revision ||
          current.editor !== snapshot.editor ||
          !current.editor.isConnected
        ) {
          logDiagnostic("stale-revision", snapshot);
          return;
        }

        const slice = resolveCjkSlice(current.text, current.caretOffset);
        if (!slice) {
          logDiagnostic("no-cjk-content", current);
          return;
        }

        const sliceAnchorRect = measureEditorTextOffset(
          current.editor,
          slice.start
        );
        if (!sliceAnchorRect) {
          logDiagnostic("slice-anchor-unmappable", current);
          return;
        }

        console.info("[flash-translate][input-assist] slice", {
          end: slice.end,
          revision: current.revision,
          sessionId: current.sessionId,
          start: slice.start,
          textLength: slice.text.length,
        });

        setAssist({
          anchorRect: sliceAnchorRect,
          sessionId: current.sessionId,
          revision: current.revision,
        });
        setAnchorRect(sliceAnchorRect);
        anchorTrackerRef.current.start(
          () => {
            const latest = snapshotRef.current;
            if (
              !latest ||
              latest.sessionId !== current.sessionId ||
              latest.revision !== current.revision
            ) {
              return null;
            }
            return refreshEditorAnchor(latest, slice.start);
          },
          (rect) => setAnchorRect(rect),
          current.editor
        );
        translation
          .translate(slice.text)
          .catch(() => logDiagnostic("translation-failed", current));
      }, INPUT_DEBOUNCE_MS);
    };

    const onCompositionStart = () => {
      composingRef.current = true;
      clearAssist();
    };
    const onCompositionEnd = (event: CompositionEvent) => {
      composingRef.current = false;
      schedule(event);
    };
    const onInput = (event: Event) => schedule(event);
    const onFocusOut = () => clearAssist();

    document.addEventListener("input", onInput, true);
    document.addEventListener("compositionstart", onCompositionStart, true);
    document.addEventListener("compositionend", onCompositionEnd, true);
    document.addEventListener("focusout", onFocusOut, true);
    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener(
        "compositionstart",
        onCompositionStart,
        true
      );
      document.removeEventListener("compositionend", onCompositionEnd, true);
      document.removeEventListener("focusout", onFocusOut, true);
      clearAssist();
    };
  }, [enabled, translation.reset, translation.translate]);

  // The language pair intentionally triggers cleanup even though it is not read in the body.
  // biome-ignore lint/correctness/useExhaustiveDependencies: language changes must reset the active assist session
  useEffect(() => {
    setAssist(null);
    setAnchorRect(null);
    snapshotRef.current = null;
    anchorTrackerRef.current.stop();
    translation.reset();
  }, [sourceLanguage, targetLanguage, translation.reset]);

  useEffect(() => {
    if (translation.error) {
      logDiagnostic("translation-failed");
    }
  }, [translation.error]);

  const visible =
    assist &&
    anchorRect &&
    assist.sessionId === snapshotRef.current?.sessionId &&
    assist.revision === snapshotRef.current?.revision;

  return {
    rect: visible ? anchorRect : null,
    text: visible ? translation.result : "",
    isLoading: Boolean(visible && translation.isLoading),
    error: visible ? (translation.error?.message ?? null) : null,
  };
}
