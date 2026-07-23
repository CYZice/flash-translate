import { Sparkles } from "lucide-react";
import { getMessage } from "@/shared/utils/i18n";
import { getTermTooltipPosition } from "./term-tooltip-position";
import type { HoveredTermTranslationState } from "./use-hovered-term-translation";

interface HoveredTermTooltipProps {
  state: HoveredTermTranslationState;
}

const DETAIL_TOOLTIP_SIZE = {
  width: 384,
  height: 320,
};

function InsightRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <dt className="font-medium text-gray-500 text-xs">{label}</dt>
      <dd className="wrap-break-word mt-0.5 text-gray-800" dir="auto">
        {value}
      </dd>
    </div>
  );
}

function TermInsightContent({ state }: { state: HoveredTermTranslationState }) {
  const insight = state.insightResult?.insight ?? state.insightProgress;
  const isGenerating =
    state.insightStatus === "loading" || state.insightStatus === "streaming";

  return (
    <div className="mt-3 border-stone-200 border-t border-solid pt-3">
      <div className="flex items-center gap-1.5 font-medium text-blue-700 text-xs">
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
        <span>{getMessage("content_termInsightDetails")}</span>
      </div>

      {isGenerating && (
        <div className="mt-4 flex items-center gap-2 text-gray-500">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          <span>{getMessage("content_termInsightLoading")}</span>
        </div>
      )}

      <dl className="mt-3 grid gap-3">
        <InsightRow
          label={getMessage("content_termInsight")}
          value={insight.contextualMeaning}
        />
        {insight.isMultiwordExpression && (
          <InsightRow
            label={getMessage("content_termExpression")}
            value={insight.expression}
          />
        )}
        <InsightRow
          label={getMessage("content_termCoreMeaning")}
          value={insight.coreMeaning}
        />
        <InsightRow
          label={getMessage("content_termRoleInContext")}
          value={insight.roleInContext}
        />
        <InsightRow
          label={getMessage("content_termPartOfSpeech")}
          value={insight.partOfSpeech}
        />
      </dl>

      {(state.insightStatus === "unavailable" ||
        state.insightStatus === "error") && (
        <p className="mt-3 text-gray-500">
          {getMessage(
            state.insightStatus === "unavailable"
              ? "content_termInsightUnavailable"
              : "content_termInsightFailed"
          )}
        </p>
      )}
    </div>
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
    <div
      className="wrap-break-word font-medium text-gray-900 text-lg leading-snug"
      dir="auto"
    >
      {state.result?.translatedText}
    </div>
  );
}

export function HoveredTermTooltip({ state }: HoveredTermTooltipProps) {
  if (!state.hoveredTerm) {
    return null;
  }

  const isDetailed = state.result !== null;
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
    transform: "translateX(-50%)",
    viewTransitionName: "flash-translate-term-tooltip",
    zIndex: 2_147_483_647,
  };

  return (
    <output
      aria-label={getMessage("content_termTranslation")}
      aria-live="polite"
      className={`pointer-events-auto fixed max-w-[calc(100vw-1rem)] rounded-lg border border-stone-300/80 border-solid bg-white/90 px-3 py-2 font-sans text-gray-800 text-sm leading-normal shadow-xl backdrop-blur-md ${
        isDetailed ? "w-96" : "w-72"
      }`}
      data-flash-translate-term-tooltip=""
      style={tooltipStyle}
    >
      <QuickTranslationContent state={state} />
      {state.result && <TermInsightContent state={state} />}
    </output>
  );
}
