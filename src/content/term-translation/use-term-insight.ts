import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import type { HoveredTerm, TermTranslationResult } from "./hovered-term";
import { promptTermInsightProvider } from "./prompt-term-insight-provider";
import type {
  TermInsightResult,
  TermInsightUnavailableReason,
} from "./term-insight";
import { TermInsightUnavailableError } from "./term-insight";
import { TermInsightCache } from "./term-insight-cache";
import { executeTermInsight } from "./term-insight-executor";
import { runTermViewTransition } from "./term-view-transition";

export interface TermInsightViewState {
  isPinned: boolean;
  insightStatus: "idle" | "loading" | "ready" | "unavailable" | "error";
  insightResult: TermInsightResult | null;
  insightUnavailableReason: TermInsightUnavailableReason | null;
}

interface UseTermInsightOptions {
  hoveredTermRef: RefObject<HoveredTerm | null>;
  translationResultRef: RefObject<TermTranslationResult | null>;
  transitionScopeRef: RefObject<HTMLElement | null>;
}

interface TermInsightController extends TermInsightViewState {
  isPinnedRef: RefObject<boolean>;
  dismissInsight: () => void;
  resetInsight: () => void;
}

const IDLE_INSIGHT_STATE: TermInsightViewState = {
  isPinned: false,
  insightStatus: "idle",
  insightResult: null,
  insightUnavailableReason: null,
};

function isPointInsideHoveredTerm(
  hoveredTerm: HoveredTerm | null,
  x: number,
  y: number
): boolean {
  if (!hoveredTerm) {
    return false;
  }

  const { anchorRect } = hoveredTerm;
  return (
    anchorRect.left <= x &&
    x <= anchorRect.right &&
    anchorRect.top <= y &&
    y <= anchorRect.bottom
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

export function useTermInsight({
  hoveredTermRef,
  translationResultRef,
  transitionScopeRef,
}: UseTermInsightOptions): TermInsightController {
  const [state, setState] = useState<TermInsightViewState>(IDLE_INSIGHT_STATE);
  const isPinnedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef(new TermInsightCache());

  const clearPendingInsight = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestIdRef.current += 1;
  }, []);

  const resetInsight = useCallback(() => {
    clearPendingInsight();
    isPinnedRef.current = false;
    setState(IDLE_INSIGHT_STATE);
  }, [clearPendingInsight]);

  const dismissInsight = useCallback(() => {
    resetInsight();
  }, [resetInsight]);

  useEffect(() => {
    const transitionToState = (nextState: TermInsightViewState) => {
      return runTermViewTransition(document, transitionScopeRef.current, () => {
        flushSync(() => setState(nextState));
      });
    };

    const analyzeCurrentTerm = (
      hoveredTerm: HoveredTerm,
      translation: TermTranslationResult
    ) => {
      clearPendingInsight();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      isPinnedRef.current = true;
      const loadingStateReady = transitionToState({
        isPinned: true,
        insightStatus: "loading",
        insightResult: null,
        insightUnavailableReason: null,
      });
      const insight = executeTermInsight({
        hoveredTerm,
        translation,
        signal: abortController.signal,
        cache: cacheRef.current,
        provider: promptTermInsightProvider,
      });

      return Promise.all([loadingStateReady, insight])
        .then(([, insightResult]) => {
          if (
            !isRequestActive(
              requestId,
              requestIdRef.current,
              abortController.signal
            )
          ) {
            return;
          }

          return transitionToState({
            isPinned: true,
            insightStatus: "ready",
            insightResult,
            insightUnavailableReason: null,
          });
        })
        .catch((error: unknown) => {
          if (isCanceledRequest(error, abortController.signal)) {
            return;
          }

          const unavailableReason =
            error instanceof TermInsightUnavailableError ? error.reason : null;
          setState({
            isPinned: true,
            insightStatus: unavailableReason ? "unavailable" : "error",
            insightResult: null,
            insightUnavailableReason: unavailableReason,
          });
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            abortControllerRef.current = null;
          }
        });
    };

    const handleTermMouseDown = (event: MouseEvent) => {
      if (
        translationResultRef.current &&
        isPointInsideHoveredTerm(
          hoveredTermRef.current,
          event.clientX,
          event.clientY
        )
      ) {
        event.preventDefault();
      }
    };

    const handleTermClick = (event: MouseEvent) => {
      const hoveredTerm = hoveredTermRef.current;
      const translation = translationResultRef.current;
      if (
        isPinnedRef.current ||
        !hoveredTerm ||
        !translation ||
        !isPointInsideHoveredTerm(hoveredTerm, event.clientX, event.clientY)
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      analyzeCurrentTerm(hoveredTerm, translation).catch(resetInsight);
    };

    document.addEventListener("mousedown", handleTermMouseDown, true);
    document.addEventListener("click", handleTermClick, true);

    return () => {
      document.removeEventListener("mousedown", handleTermMouseDown, true);
      document.removeEventListener("click", handleTermClick, true);
      clearPendingInsight();
      isPinnedRef.current = false;
    };
  }, [
    clearPendingInsight,
    hoveredTermRef,
    resetInsight,
    transitionScopeRef,
    translationResultRef,
  ]);

  return {
    ...state,
    isPinnedRef,
    dismissInsight,
    resetInsight,
  };
}
