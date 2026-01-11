import { useEffect, useRef, useState } from "react";
import {
  getSelectionRect,
  getValidSelectionText,
  isClickInsideShadowHost,
  isNodeInContentEditable,
  type SelectionInfo,
  shouldShowCardForSelection,
} from "./text-selection";

export type { SelectionInfo } from "./text-selection";

const SELECTION_DELAY_MS = 10;
const HOST_ID = "flash-translate-root";

interface SelectionDetails {
  text: string;
  rect: DOMRect;
}

function buildSelectionInfo(
  selection: Selection | null,
  rawText: string | undefined | null,
  fallbackRect: DOMRect
): SelectionDetails | null {
  const validText = getValidSelectionText(rawText);
  if (!validText) {
    return null;
  }

  const rect = getSelectionRect(selection, fallbackRect);
  if (!rect) {
    return null;
  }

  return { text: validText, rect };
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

export function useTextSelection() {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const lastSelectionTextRef = useRef<string | null>(null);
  const pendingClearRef = useRef(false);

  const handleMouseUp = () => {
    // Delay to ensure selection is complete
    setTimeout(() => {
      const windowSelection = window.getSelection();
      const isContentEditable = isNodeInContentEditable(
        windowSelection?.anchorNode ?? null
      );

      // Skip translation for contenteditable elements (text inputs, editors, etc.)
      if (isContentEditable) {
        handlePendingClear(pendingClearRef, setSelection, lastSelectionTextRef);
        return;
      }

      const rawText = windowSelection?.toString();
      const selectionInfo = buildSelectionInfo(
        windowSelection,
        rawText,
        document.body.getBoundingClientRect()
      );
      if (!selectionInfo) {
        handlePendingClear(pendingClearRef, setSelection, lastSelectionTextRef);
        return;
      }

      pendingClearRef.current = false;
      if (
        shouldShowCardForSelection(
          selectionInfo.text,
          lastSelectionTextRef.current
        )
      ) {
        setIsVisible(true);
      }
      lastSelectionTextRef.current = selectionInfo.text;
      setSelection({ text: selectionInfo.text, rect: selectionInfo.rect });
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
      return;
    }
    pendingClearRef.current = true;
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

  // Clear selection completely (used when excluding sites)
  const clearSelection = () => {
    setSelection(null);
    setIsVisible(false);
    lastSelectionTextRef.current = null;
    // Also clear the browser's text selection to prevent re-triggering
    window.getSelection()?.removeAllRanges();
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: React Compiler handles function memoization
  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return { selection, isVisible, dismissCard, clearSelection };
}
