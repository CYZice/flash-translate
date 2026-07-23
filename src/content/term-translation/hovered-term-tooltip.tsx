import { Sparkles, X } from "lucide-react";
import { getMessage } from "@/shared/utils/i18n";
import { getTermTooltipPosition } from "./term-tooltip-position";
import type {
  HoveredTermTranslationController,
  HoveredTermTranslationState,
} from "./use-hovered-term-translation";

interface HoveredTermTooltipProps {
  state: HoveredTermTranslationState;
  onRequestInsight?: HoveredTermTranslationController["requestInsight"];
  onDismissInsight?: HoveredTermTranslationController["dismissInsight"];
}

const DETAIL_TOOLTIP_SIZE = {
  width: 384,
  height: 320,
};

function TermInsightContent({
  state,
  onDismissInsight,
}: {
  state: HoveredTermTranslationState;
  onDismissInsight: HoveredTermTranslationController["dismissInsight"];
}) {
  const insight = state.insightResult?.insight;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-medium text-blue-700 text-xs">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{getMessage("content_termInsight")}</span>
          </div>
          <div
            className="wrap-break-word mt-1 font-medium text-gray-900 text-lg leading-snug"
            dir="auto"
          >
            {insight?.contextualMeaning ?? state.result?.translatedText}
          </div>
        </div>
        <button
          aria-label={getMessage("content_close")}
          className="-mt-1 -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          onClick={onDismissInsight}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      {state.insightStatus === "loading" && (
        <div className="mt-4 flex items-center gap-2 text-gray-500">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          <span>{getMessage("content_termInsightLoading")}</span>
        </div>
      )}

      {state.insightStatus === "ready" && insight && (
        <dl className="mt-4 grid gap-3 border-stone-200 border-t border-solid pt-3">
          {insight.isMultiwordExpression && (
            <div>
              <dt className="font-medium text-gray-500 text-xs">
                {getMessage("content_termExpression")}
              </dt>
              <dd className="mt-0.5 text-gray-800" dir="auto">
                {insight.expression}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-gray-500 text-xs">
              {getMessage("content_termCoreMeaning")}
            </dt>
            <dd className="mt-0.5 text-gray-800" dir="auto">
              {insight.coreMeaning}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500 text-xs">
              {getMessage("content_termRoleInContext")}
            </dt>
            <dd className="mt-0.5 text-gray-800" dir="auto">
              {insight.roleInContext}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500 text-xs">
              {getMessage("content_termPartOfSpeech")}
            </dt>
            <dd className="mt-0.5 text-gray-800" dir="auto">
              {insight.partOfSpeech}
            </dd>
          </div>
        </dl>
      )}

      {(state.insightStatus === "unavailable" ||
        state.insightStatus === "error") && (
        <p className="mt-4 border-stone-200 border-t border-solid pt-3 text-gray-500">
          {getMessage(
            state.insightStatus === "unavailable"
              ? "content_termInsightUnavailable"
              : "content_termInsightFailed"
          )}
        </p>
      )}
    </>
  );
}

function QuickTranslationContent({
  state,
}: {
  state: HoveredTermTranslationState;
}) {
  if (state.isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        <span>{getMessage("content_translating")}</span>
      </div>
    );
  }

  return (
    <>
      <div className="wrap-break-word text-base leading-snug" dir="auto">
        {state.result?.translatedText}
      </div>
      {state.result && (
        <div className="mt-1 text-gray-400 text-xs">
          {getMessage("content_termInsightHint")}
        </div>
      )}
    </>
  );
}

export function HoveredTermTooltip({
  state,
  onRequestInsight = () => undefined,
  onDismissInsight = () => undefined,
}: HoveredTermTooltipProps) {
  if (!state.hoveredTerm) {
    return null;
  }

  const isDetailed = state.isPinned;
  const position = getTermTooltipPosition(
    state.hoveredTerm.anchorRect,
    {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    isDetailed ? DETAIL_TOOLTIP_SIZE : undefined
  );
  const tooltipStyle = {
    left: `${position.left}px`,
    top: `${position.top}px`,
    viewTransitionName: "flash-translate-term-tooltip",
    zIndex: 2_147_483_647,
  };

  if (!isDetailed) {
    return (
      <button
        aria-label={getMessage("content_termTranslation")}
        className="pointer-events-auto fixed w-72 max-w-[calc(100vw-1rem)] -translate-x-1/2 cursor-pointer rounded-lg border border-stone-300/80 border-solid bg-white/90 px-3 py-2 text-left font-sans text-gray-800 text-sm leading-normal shadow-xl backdrop-blur-md hover:border-blue-300"
        data-flash-translate-term-tooltip=""
        onClick={onRequestInsight}
        style={tooltipStyle}
        type="button"
      >
        <QuickTranslationContent state={state} />
      </button>
    );
  }

  return (
    <output
      aria-label={getMessage("content_termTranslation")}
      className="pointer-events-auto fixed w-96 max-w-[calc(100vw-1rem)] -translate-x-1/2 rounded-lg border border-stone-300/80 border-solid bg-white/90 px-3 py-2 font-sans text-gray-800 text-sm leading-normal shadow-xl backdrop-blur-md"
      data-flash-translate-term-tooltip=""
      style={tooltipStyle}
    >
      <TermInsightContent onDismissInsight={onDismissInsight} state={state} />
    </output>
  );
}
