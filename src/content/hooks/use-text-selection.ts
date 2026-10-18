import { useEffect, useRef, useState } from "react";
import { useLatestRef } from "@/shared/hooks/use-latest-ref";
import { MAX_SELECTION_CONTEXT_CHARACTERS } from "@/shared/selection/selection-text";
import {
  DEFAULT_AI_CONTEXT_SENTENCE_COUNT,
  getContextAroundSelection,
} from "@/shared/utils/ai-context";
import {
  cloneSelectionRanges,
  getRangesContext,
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

function getControlSelection(sentenceCount: number): SelectionInfo | null {
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
  return {
    text,
    rect: element.getBoundingClientRect(),
    ranges: [],
    readContext: () => {
      if (
        sentenceCount === 0 ||
        !element.isConnected ||
        element.value.slice(start, end).trim() !== text
      ) {
        return { contextBefore: "", contextAfter: "" };
      }
      return getContextAroundSelection(
        element.value.slice(
          Math.max(0, start - MAX_SELECTION_CONTEXT_CHARACTERS),
          start
        ),
        element.value.slice(end, end + MAX_SELECTION_CONTEXT_CHARACTERS),
        sentenceCount
      );
    },
  };
}

function buildSelectionInfo(
  selection: Selection | null,
  rawText: string | undefined | null,
  fallbackRect: DOMRect,
  sentenceCount: number
): SelectionInfo | null {
  const validText = getValidSelectionText(rawText);
  if (!validText) {
    return null;
  }

  const rect = getSelectionRect(selection, fallbackRect);
  if (!rect) {
    return null;
  }

  const ranges = cloneSelectionRanges(selection);

  return {
    text: validText,
    rect,
    ranges,
    readContext: () => getRangesContext(ranges, sentenceCount),
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
  sentenceCount = DEFAULT_AI_CONTEXT_SENTENCE_COUNT,
  selectionTrigger: "immediate" | "badge" = "badge"
) {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const pinnedRef = useLatestRef(isPinned);
  const selectionRef = useLatestRef(selection);
  const lastSelectionTextRef = useRef<string | null>(null);
  const pendingClearRef = useRef(false);
  const selectionTextAtPointerDownRef = useRef<string | null>(null);
  const selectionTimerRef = useRef<number | null>(null);
  const isSelectingRef = useRef(false);

  const scheduleCardDisplay = () => {
    setIsVisible(pinnedRef.current || selectionTrigger === "immediate");
  };

  const handleMouseUp = (event: Event) => {
    if (event.type === "mouseup") {
      isSelectingRef.current = false;
    }
    if (isClickInsideShadowHost(event.composedPath(), HOST_ID)) {
      return;
    }
    if (isSelectingRef.current) {
      return;
    }
    // Delay to ensure selection is complete
    if (selectionTimerRef.current !== null) {
      window.clearTimeout(selectionTimerRef.current);
    }
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: selection extraction and dismissal must run atomically after the DOM settles
    selectionTimerRef.current = window.setTimeout(() => {
      selectionTimerRef.current = null;
      const windowSelection = window.getSelection();
      const controlSelection = getControlSelection(sentenceCount);
      if (controlSelection) {
        pendingClearRef.current = false;
        if (controlSelection.text !== lastSelectionTextRef.current) {
          scheduleCardDisplay();
        }
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
        !pinnedRef.current &&
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
        if (!pinnedRef.current) {
          handlePendingClear(
            pendingClearRef,
            setSelection,
            lastSelectionTextRef
          );
        }
        pendingClearRef.current = false;
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
        scheduleCardDisplay();
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
    isSelectingRef.current = true;
    if (selectionTimerRef.current !== null) {
      window.clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = null;
    }
    selectionTextAtPointerDownRef.current =
      getControlSelection(sentenceCount)?.text ??
      getSelectionText(window.getSelection());
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      // Escape key hides card but keeps text selection
      dismissCard();
    }
  };

  // Keep the browser's selection, but release our retained text and DOM ranges.
  const dismissCard = () => {
    if (selectionTimerRef.current !== null) {
      window.clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = null;
    }
    setIsPinned(false);
    isSelectingRef.current = false;
    pendingClearRef.current = false;
    selectionTextAtPointerDownRef.current = null;
    setIsVisible(false);
    clearSelectionState(setSelection, lastSelectionTextRef);
  };

  const activateCard = () => {
    if (selection) {
      setIsVisible(true);
    }
  };

  const dismissForPageLifecycle = () => {
    if (selectionTimerRef.current !== null) {
      window.clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = null;
    }
    setIsPinned(false);
    isSelectingRef.current = false;
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
    const dispatchHistoryNavigation = () =>
      window.dispatchEvent(new Event("flash-translate:navigation"));
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      dispatchHistoryNavigation();
      return result;
    };
    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      dispatchHistoryNavigation();
      return result;
    };

    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("selectionchange", handleMouseUp, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", dismissForPageLifecycle);
    window.addEventListener("pagehide", dismissForPageLifecycle);
    window.addEventListener("popstate", dismissForPageLifecycle);
    window.addEventListener("hashchange", dismissForPageLifecycle);
    window.addEventListener(
      "flash-translate:navigation",
      dismissForPageLifecycle
    );

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
      window.removeEventListener(
        "flash-translate:navigation",
        dismissForPageLifecycle
      );
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      if (selectionTimerRef.current !== null) {
        window.clearTimeout(selectionTimerRef.current);
      }
    };
  }, [sentenceCount, selectionTrigger]);

  // Apply a mode change to the current selection, not only the next one.
  useEffect(() => {
    if (selectionRef.current) {
      setIsVisible(pinnedRef.current || selectionTrigger === "immediate");
    }
  }, [selectionTrigger, pinnedRef, selectionRef]);

  const togglePin = () => setIsPinned((pinned) => !pinned);

  return {
    selection,
    isVisible,
    isPinned,
    togglePin,
    dismissCard,
    activateCard,
  };
}
