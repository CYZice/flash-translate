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
  TermInsightProgress,
  TermInsightResult,
  TermInsightUnavailableReason,
} from "./term-insight";
import { TermInsightUnavailableError } from "./term-insight";
import { TermInsightCache } from "./term-insight-cache";
import { executeTermInsight } from "./term-insight-executor";
import { runTermViewTransition } from "./term-view-transition";

export interface TermInsightViewState {
  insightStatus:
    | "idle"
    | "loading"
    | "streaming"
    | "ready"
    | "unavailable"
    | "error";
  insightResult: TermInsightResult | null;
  insightProgress: TermInsightProgress;
  insightUnavailableReason: TermInsightUnavailableReason | null;
}

interface UseTermInsightOptions {
  transitionScopeRef: RefObject<HTMLElement | null>;
}

interface TermInsightController extends TermInsightViewState {
  startInsight: (
    hoveredTerm: HoveredTerm,
    translation: TermTranslationResult
  ) => void;
  resetInsight: () => void;
}

const IDLE_INSIGHT_STATE: TermInsightViewState = {
  insightStatus: "idle",
  insightResult: null,
  insightProgress: {},
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
  transitionScopeRef,
}: UseTermInsightOptions): TermInsightController {
  const [state, setState] = useState<TermInsightViewState>(IDLE_INSIGHT_STATE);
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
    setState(IDLE_INSIGHT_STATE);
  }, [clearPendingInsight]);

  const startInsight = useCallback(
    (hoveredTerm: HoveredTerm, translation: TermTranslationResult) => {
      clearPendingInsight();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const transitionToState = (nextState: TermInsightViewState) => {
        return runTermViewTransition(
          document,
          transitionScopeRef.current,
          () => {
            flushSync(() => setState(nextState));
          }
        );
      };
      const loadingStateReady = transitionToState({
        insightStatus: "loading",
        insightResult: null,
        insightProgress: {},
        insightUnavailableReason: null,
      });

      loadingStateReady
        .then(() =>
          executeTermInsight({
            hoveredTerm,
            translation,
            signal: abortController.signal,
            cache: cacheRef.current,
            provider: promptTermInsightProvider,
            onProgress: (insightProgress) => {
              if (
                !isRequestActive(
                  requestId,
                  requestIdRef.current,
                  abortController.signal
                ) ||
                Object.keys(insightProgress).length === 0
              ) {
                return;
              }

              setState({
                insightStatus: "streaming",
                insightResult: null,
                insightProgress,
                insightUnavailableReason: null,
              });
            },
          })
        )
        .then((insightResult) => {
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
            insightStatus: "ready",
            insightResult,
            insightProgress: insightResult.insight,
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
            insightStatus: unavailableReason ? "unavailable" : "error",
            insightResult: null,
            insightProgress: {},
            insightUnavailableReason: unavailableReason,
          });
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            abortControllerRef.current = null;
          }
        });
    },
    [clearPendingInsight, transitionScopeRef]
  );

  useEffect(() => {
    return () => clearPendingInsight();
  }, [clearPendingInsight]);

  return {
    ...state,
    startInsight,
    resetInsight,
  };
}
