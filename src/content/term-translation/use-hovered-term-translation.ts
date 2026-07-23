import { type RefObject, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { translatorManager } from "@/shared/utils/translator";
import type { SelectionInfo } from "../hooks/use-text-selection";
import {
  type HoveredTerm,
  isPointInsideViewportRect,
  type TermTranslationResult,
} from "./hovered-term";
import {
  isPointInsideSelectionRanges,
  resolveHoveredTermAtPoint,
} from "./selection-term-resolver";
import { TermTranslationCache } from "./term-translation-cache";
import { executeTermTranslation } from "./term-translation-executor";
import { runTermViewTransition } from "./term-view-transition";
import { type TermInsightViewState, useTermInsight } from "./use-term-insight";

interface UseHoveredTermTranslationOptions {
  selection: SelectionInfo | null;
  sourceLanguage: string;
  targetLanguage: string;
  transitionScopeRef: RefObject<HTMLElement | null>;
  enabled: boolean;
}

interface QuickTermTranslationState {
  hoveredTerm: HoveredTerm | null;
  result: TermTranslationResult | null;
  isLoading: boolean;
}

export interface HoveredTermTranslationState
  extends QuickTermTranslationState,
    TermInsightViewState {}

export interface HoveredTermTranslationController
  extends HoveredTermTranslationState {
  requestInsight: () => void;
  dismissInsight: () => void;
}

const IDLE_STATE: QuickTermTranslationState = {
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
    current.termOffset === next.termOffset &&
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

type PointerMoveAction =
  | { type: "clear" }
  | { type: "keep" }
  | { type: "translate"; hoveredTerm: HoveredTerm };

function resolvePointerMoveAction({
  event,
  enabled,
  selection,
  sourceLanguage,
  currentHoveredTerm,
}: {
  event: PointerEvent;
  enabled: boolean;
  selection: SelectionInfo | null;
  sourceLanguage: string;
  currentHoveredTerm: HoveredTerm | null;
}): PointerMoveAction {
  const isInsideTooltip = event
    .composedPath()
    .some(
      (node) =>
        node instanceof HTMLElement &&
        node.hasAttribute("data-flash-translate-term-tooltip")
    );
  if (isInsideTooltip) {
    return { type: "keep" };
  }

  if (!(enabled && selection) || event.pointerType === "touch") {
    return { type: "clear" };
  }

  const hoveredTerm = resolveHoveredTermAtPoint({
    document,
    x: event.clientX,
    y: event.clientY,
    selectionRanges: selection.ranges,
    contextText: selection.text,
    sourceLanguage,
  });
  if (isSameHoveredTerm(currentHoveredTerm, hoveredTerm)) {
    return { type: "keep" };
  }
  if (hoveredTerm) {
    return { type: "translate", hoveredTerm };
  }

  return isPointInsideSelectionRanges(
    selection.ranges,
    event.clientX,
    event.clientY
  )
    ? { type: "keep" }
    : { type: "clear" };
}

export function useHoveredTermTranslation({
  selection,
  sourceLanguage,
  targetLanguage,
  transitionScopeRef,
  enabled,
}: UseHoveredTermTranslationOptions): HoveredTermTranslationController {
  const [state, setState] = useState<QuickTermTranslationState>(IDLE_STATE);
  const hoveredTermRef = useRef<HoveredTerm | null>(null);
  const translationResultRef = useRef<TermTranslationResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef(new TermTranslationCache());
  const termInsight = useTermInsight({
    hoveredTermRef,
    translationResultRef,
    transitionScopeRef,
  });

  useEffect(() => {
    const clearPendingTranslation = () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      requestIdRef.current += 1;
    };

    const transitionToState = (nextState: QuickTermTranslationState) => {
      return runTermViewTransition(document, transitionScopeRef.current, () => {
        flushSync(() => setState(nextState));
      });
    };

    const clearHoveredTerm = () => {
      clearPendingTranslation();
      termInsight.resetInsight();
      if (!hoveredTermRef.current) {
        return;
      }

      hoveredTermRef.current = null;
      translationResultRef.current = null;
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
      translationResultRef.current = null;
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

          translationResultRef.current = result;
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
      if (termInsight.isPinnedRef.current) {
        return;
      }

      const action = resolvePointerMoveAction({
        event,
        enabled,
        selection,
        sourceLanguage,
        currentHoveredTerm: hoveredTermRef.current,
      });
      if (action.type === "clear") {
        clearHoveredTerm();
        return;
      }
      if (action.type === "keep") {
        return;
      }

      clearPendingTranslation();
      hoveredTermRef.current = action.hoveredTerm;
      translateHoveredTerm(action.hoveredTerm).catch(clearHoveredTerm);
    };

    const handleTermPointerDown = (event: PointerEvent) => {
      const hoveredTerm = hoveredTermRef.current;
      if (
        event.button !== 0 ||
        termInsight.isPinnedRef.current ||
        !translationResultRef.current ||
        !hoveredTerm ||
        !isPointInsideViewportRect(
          hoveredTerm.anchorRect,
          event.clientX,
          event.clientY
        )
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      termInsight.requestInsight();
    };

    document.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    document.addEventListener("pointerdown", handleTermPointerDown, true);
    window.addEventListener("resize", clearHoveredTerm);
    window.addEventListener("scroll", clearHoveredTerm, true);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerdown", handleTermPointerDown, true);
      window.removeEventListener("resize", clearHoveredTerm);
      window.removeEventListener("scroll", clearHoveredTerm, true);
      clearPendingTranslation();
      hoveredTermRef.current = null;
      translationResultRef.current = null;
    };
  }, [
    enabled,
    selection,
    sourceLanguage,
    targetLanguage,
    termInsight.isPinnedRef,
    termInsight.requestInsight,
    termInsight.resetInsight,
    transitionScopeRef,
  ]);

  return {
    ...state,
    isPinned: termInsight.isPinned,
    insightStatus: termInsight.insightStatus,
    insightResult: termInsight.insightResult,
    insightUnavailableReason: termInsight.insightUnavailableReason,
    requestInsight: termInsight.requestInsight,
    dismissInsight: termInsight.dismissInsight,
  };
}
