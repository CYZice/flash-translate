import { getMessage } from "@/shared/utils/i18n";
import { getTermTooltipPosition } from "./term-tooltip-position";
import type { HoveredTermTranslationState } from "./use-hovered-term-translation";

interface HoveredTermTooltipProps {
  state: HoveredTermTranslationState;
}

export function HoveredTermTooltip({ state }: HoveredTermTooltipProps) {
  if (!state.hoveredTerm) {
    return null;
  }

  const position = getTermTooltipPosition(state.hoveredTerm.anchorRect, {
    width: window.innerWidth,
    height: window.innerHeight,
  });

  return (
    <output
      aria-label={getMessage("content_termTranslation")}
      className="pointer-events-none fixed w-72 max-w-[calc(100vw-1rem)] -translate-x-1/2 rounded-lg border border-stone-300/80 border-solid bg-white/90 px-3 py-2 font-sans text-gray-800 text-sm leading-normal shadow-xl backdrop-blur-md"
      data-flash-translate-term-tooltip=""
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        zIndex: 2_147_483_647,
      }}
    >
      <div className="truncate text-gray-500 text-xs" dir="auto">
        {state.hoveredTerm.sourceText}
      </div>
      {state.isLoading ? (
        <div className="mt-1 flex items-center gap-2 text-gray-500">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          <span>{getMessage("content_translating")}</span>
        </div>
      ) : (
        <div className="wrap-break-word mt-1 text-base leading-snug" dir="auto">
          {state.result?.translatedText}
        </div>
      )}
    </output>
  );
}
