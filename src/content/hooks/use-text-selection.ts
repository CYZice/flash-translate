import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_AI_CONTEXT_SENTENCE_COUNT,
  getContextAroundSelection,
} from "@/shared/utils/ai-context";
import {
  cloneSelectionRanges,
  getSelectionContext,
  getSelectionRect,
  getSelectionText,
  getValidSelectionText,
  isClickInsideShadowHost,
  type SelectionInfo,
  shouldClearSelectionAfterOutsideInteraction,
  shouldShowCardForSelection,
} from "./text-selection";

export type { SelectionInfo } from "./text-selection";

const SELECTION_DELAY_MS = 10;
const HOST_ID = "flash-translate-root";

interface SelectionDetails {
  text: string;
  rect: DOMRect;
  ranges: readonly Range[];
  contextBefore: string;
  contextAfter: string;
}

function getControlSelection(sentenceCount: number): SelectionDetails | null {
  const element = document.activeElement;
  if (
    !(
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLInputElement
    )
  ) {
    return null;
  }
  if (element.type === "password") {
    return null;
  }
  const start = element.selectionStart ?? 0;
  const end = element.selectionEnd ?? 0;
  if (start === end) {
    return null;
  }
  const text = element.value.slice(start, end).trim();
  if (!text) {
    return null;
  }
  const context = getContextAroundSelection(
    element.value.slice(0, start),
    element.value.slice(end),
    sentenceCount
  );
  return {
    text,
    rect: element.getBoundingClientRect(),
    ranges: [],
    ...context,
  };
}

function buildSelectionInfo(
  selection: Selection | null,
  rawText: string | undefined | null,
  fallbackRect: DOMRect,
  sentenceCount: number
): SelectionDetails | null {
  const validText = getValidSelectionText(rawText);
  if (!validText) {
    return null;
  }

  const rect = getSelectionRect(selection, fallbackRect);
  if (!rect) {
    return null;
  }

  const { contextBefore, contextAfter } = getSelectionContext(
    selection,
    sentenceCount
  );

  return {
    text: validText,
    rect,
    ranges: cloneSelectionRanges(selection),
    contextBefore,
    contextAfter,
  };
}

function clearSelectionState(
  setSelection: (value: SelectionInfo | null) => void,
  lastSelectionTextRef: React.MutableRefObject<string | null>
) {
  setSelection(null);
  lastSelectionTextRef.current = null;
}

function handlePendingClear(
  pendingClearRef: React.MutableRefObject<boolean>,
  setSelection: (value: SelectionInfo | null) => void,
  lastSelectionTextRef: React.MutableRefObject<string | null>
) {
  if (pendingClearRef.current) {
    clearSelectionState(setSelection, lastSelectionTextRef);
  }
  pendingClearRef.current = false;
}

export function useTextSelection(
  sentenceCount = DEFAULT_AI_CONTEXT_SENTENCE_COUNT
) {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const lastSelectionTextRef = useRef<string | null>(null);
  const pendingClearRef = useRef(false);
  const selectionTextAtPointerDownRef = useRef<string | null>(null);

  const handleMouseUp = () => {
    // Delay to ensure selection is complete
    setTimeout(() => {
      const windowSelection = window.getSelection();
      const controlSelection = getControlSelection(sentenceCount);
      if (controlSelection) {
        pendingClearRef.current = false;
        setIsVisible(true);
        lastSelectionTextRef.current = controlSelection.text;
        setSelection(controlSelection);
        return;
      }
      const rawText = getSelectionText(windowSelection);
      const selectionInfo = buildSelectionInfo(
        windowSelection,
        rawText,
        document.body.getBoundingClientRect(),
        sentenceCount
      );
      if (
        pendingClearRef.current &&
        shouldClearSelectionAfterOutsideInteraction(
          selectionInfo?.text ?? null,
          selectionTextAtPointerDownRef.current
        )
      ) {
        clearSelectionState(setSelection, lastSelectionTextRef);
        pendingClearRef.current = false;
        selectionTextAtPointerDownRef.current = null;
        return;
      }
      if (!selectionInfo) {
        handlePendingClear(pendingClearRef, setSelection, lastSelectionTextRef);
        selectionTextAtPointerDownRef.current = null;
        return;
      }

      pendingClearRef.current = false;
      selectionTextAtPointerDownRef.current = null;
      if (
        shouldShowCardForSelection(
          selectionInfo.text,
          lastSelectionTextRef.current
        )
      ) {
        setIsVisible(true);
      }
      lastSelectionTextRef.current = selectionInfo.text;
      setSelection(selectionInfo);
    }, SELECTION_DELAY_MS);
  };

  const handleMouseDown = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const shadowHost = document.getElementById(HOST_ID);
    const path = event.composedPath();
    const isInsideShadowHost =
      shadowHost?.contains(target) || isClickInsideShadowHost(path, HOST_ID);

    // Close card when clicking outside our UI
    if (isInsideShadowHost) {
      pendingClearRef.current = false;
      selectionTextAtPointerDownRef.current = null;
      return;
    }
    pendingClearRef.current = true;
    selectionTextAtPointerDownRef.current =
      getControlSelection(sentenceCount)?.text ??
      getSelectionText(window.getSelection());
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      // Escape key hides card but keeps text selection
      setIsVisible(false);
    }
  };

  // Dismiss card without clearing text selection
  const dismissCard = () => {
    setIsVisible(false);
  };

  const dismissForPageLifecycle = () => {
    pendingClearRef.current = false;
    selectionTextAtPointerDownRef.current = null;
    clearSelectionState(setSelection, lastSelectionTextRef);
    setIsVisible(false);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      dismissForPageLifecycle();
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: React Compiler handles function memoization
  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("selectionchange", handleMouseUp, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", dismissForPageLifecycle);
    window.addEventListener("pagehide", dismissForPageLifecycle);
    window.addEventListener("popstate", dismissForPageLifecycle);
    window.addEventListener("hashchange", dismissForPageLifecycle);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp, true);
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("selectionchange", handleMouseUp, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", dismissForPageLifecycle);
      window.removeEventListener("pagehide", dismissForPageLifecycle);
      window.removeEventListener("popstate", dismissForPageLifecycle);
      window.removeEventListener("hashchange", dismissForPageLifecycle);
    };
  }, [sentenceCount]);

  return { selection, isVisible, dismissCard };
}
