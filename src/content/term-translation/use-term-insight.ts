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
  requestInsight: () => void;
  dismissInsight: () => void;
  resetInsight: () => void;
}

const IDLE_INSIGHT_STATE: TermInsightViewState = {
  isPinned: false,
  insightStatus: "idle",
  insightResult: null,
  insightUnavailableReason: null,
};

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

  const requestInsight = useCallback(() => {
    const hoveredTerm = hoveredTermRef.current;
    const translation = translationResultRef.current;
    if (isPinnedRef.current || !hoveredTerm || !translation) {
      return;
    }

    clearPendingInsight();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    isPinnedRef.current = true;
    const transitionToState = (nextState: TermInsightViewState) => {
      return runTermViewTransition(document, transitionScopeRef.current, () => {
        flushSync(() => setState(nextState));
      });
    };
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

    Promise.all([loadingStateReady, insight])
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
  }, [
    clearPendingInsight,
    hoveredTermRef,
    transitionScopeRef,
    translationResultRef,
  ]);

  useEffect(() => {
    return () => clearPendingInsight();
  }, [clearPendingInsight]);

  return {
    ...state,
    isPinnedRef,
    requestInsight,
    dismissInsight,
    resetInsight,
  };
}
