import { getMessage } from "@/shared/utils/i18n";
import type { HoveredTermTranslationState } from "../term-translation/use-hovered-term-translation";

interface TermTranslationStatusProps {
  state: HoveredTermTranslationState;
}

export function TermTranslationStatus({ state }: TermTranslationStatusProps) {
  const sourceText = state.hoveredTerm?.sourceText;
  if (!sourceText) {
    return null;
  }

  return (
    <output
      aria-label={getMessage("content_termTranslation")}
      aria-live="polite"
      className="flex min-h-8 min-w-0 items-center gap-1.5 overflow-hidden text-gray-700 text-xs"
      data-flash-translate-term-translation=""
    >
      <span className="min-w-0 truncate" dir="auto">
        {sourceText}
      </span>
      {state.isLoading && (
        <>
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"
          />
          <span className="sr-only">{getMessage("content_translating")}</span>
        </>
      )}
      {state.result && (
        <strong
          className="min-w-0 truncate font-semibold text-gray-950"
          dir="auto"
        >
          {state.result.translatedText}
        </strong>
      )}
    </output>
  );
}
