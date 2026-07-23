import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { translatorManager } from "@/shared/utils/translator";
import type { SelectionInfo } from "../hooks/use-text-selection";
import type { HoveredTerm, TermTranslationResult } from "./hovered-term";
import {
  isPointInsideSelectionRanges,
  resolveHoveredTermAtPoint,
} from "./selection-term-resolver";
import { TermTranslationCache } from "./term-translation-cache";
import { executeTermTranslation } from "./term-translation-executor";
import { runTermViewTransition } from "./term-view-transition";

interface UseHoveredTermTranslationOptions {
  selection: SelectionInfo | null;
  sourceLanguage: string;
  targetLanguage: string;
  enabled: boolean;
}

export interface HoveredTermTranslationState {
  hoveredTerm: HoveredTerm | null;
  result: TermTranslationResult | null;
  isLoading: boolean;
}

const IDLE_STATE: HoveredTermTranslationState = {
  hoveredTerm: null,
  result: null,
  isLoading: false,
};

function isSameHoveredTerm(
  current: HoveredTerm | null,
  next: HoveredTerm | null
): boolean {
  if (!(current && next)) {
    return current === next;
  }

  return (
    current.sourceText === next.sourceText &&
    current.anchorRect.top === next.anchorRect.top &&
    current.anchorRect.right === next.anchorRect.right &&
    current.anchorRect.bottom === next.anchorRect.bottom &&
    current.anchorRect.left === next.anchorRect.left
  );
}

function isRequestActive(
  requestId: number,
  currentRequestId: number,
  signal: AbortSignal
): boolean {
  return requestId === currentRequestId && !signal.aborted;
}

function isCanceledRequest(error: unknown, signal: AbortSignal): boolean {
  return (
    signal.aborted || (error instanceof Error && error.name === "AbortError")
  );
}

export function useHoveredTermTranslation({
  selection,
  sourceLanguage,
  targetLanguage,
  enabled,
}: UseHoveredTermTranslationOptions): HoveredTermTranslationState {
  const [state, setState] = useState<HoveredTermTranslationState>(IDLE_STATE);
  const hoveredTermRef = useRef<HoveredTerm | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef(new TermTranslationCache());

  useEffect(() => {
    const clearPendingTranslation = () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      requestIdRef.current += 1;
    };

    const transitionToState = (nextState: HoveredTermTranslationState) => {
      return runTermViewTransition(document, () => {
        flushSync(() => setState(nextState));
      });
    };

    const clearHoveredTerm = () => {
      clearPendingTranslation();
      if (!hoveredTermRef.current) {
        return;
      }

      hoveredTermRef.current = null;
      transitionToState(IDLE_STATE).catch(() => setState(IDLE_STATE));
    };

    const translateHoveredTerm = (hoveredTerm: HoveredTerm) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const loadingStateReady = transitionToState({
        hoveredTerm,
        result: null,
        isLoading: true,
      });
      const translation = executeTermTranslation({
        hoveredTerm,
        sourceLanguage,
        targetLanguage,
        signal: abortController.signal,
        cache: cacheRef.current,
        translator: translatorManager,
      });

      return Promise.all([loadingStateReady, translation])
        .then(([, result]) => {
          if (
            !isRequestActive(
              requestId,
              requestIdRef.current,
              abortController.signal
            )
          ) {
            return;
          }

          setState({
            hoveredTerm,
            result,
            isLoading: false,
          });
        })
        .catch((error: unknown) => {
          if (
            !isCanceledRequest(error, abortController.signal) &&
            requestId === requestIdRef.current
          ) {
            setState(IDLE_STATE);
          }
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            abortControllerRef.current = null;
          }
        });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!(enabled && selection) || event.pointerType === "touch") {
        clearHoveredTerm();
        return;
      }

      const hoveredTerm = resolveHoveredTermAtPoint({
        document,
        x: event.clientX,
        y: event.clientY,
        selectionRanges: selection.ranges,
        contextText: selection.text,
        sourceLanguage,
      });

      if (isSameHoveredTerm(hoveredTermRef.current, hoveredTerm)) {
        return;
      }

      if (!hoveredTerm) {
        if (
          isPointInsideSelectionRanges(
            selection.ranges,
            event.clientX,
            event.clientY
          )
        ) {
          return;
        }

        clearHoveredTerm();
        return;
      }

      clearPendingTranslation();
      hoveredTermRef.current = hoveredTerm;
      translateHoveredTerm(hoveredTerm).catch(clearHoveredTerm);
    };

    document.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("resize", clearHoveredTerm);
    window.addEventListener("scroll", clearHoveredTerm, true);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", clearHoveredTerm);
      window.removeEventListener("scroll", clearHoveredTerm, true);
      clearPendingTranslation();
      hoveredTermRef.current = null;
    };
  }, [enabled, selection, sourceLanguage, targetLanguage]);

  return state;
}
