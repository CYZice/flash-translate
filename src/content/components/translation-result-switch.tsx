import { Languages, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMessage } from "@/shared/utils/i18n";

export type TranslationResultView = "local" | "ai";

interface TranslationResultSwitchProps {
  activeView: TranslationResultView;
  aiAvailable: boolean;
  aiIsLoading: boolean;
  onViewChange: (view: TranslationResultView) => void;
}

export function TranslationResultSwitch({
  activeView,
  aiAvailable,
  aiIsLoading,
  onViewChange,
}: TranslationResultSwitchProps) {
  return (
    <fieldset className="inline-flex shrink-0 gap-0.5 border-none bg-transparent p-0">
      <legend className="sr-only">
        {getMessage("content_translationResults")}
      </legend>
      <button
        aria-pressed={activeView === "local"}
        className={cn(
          "flex h-7 items-center gap-1 rounded-sm px-1.5 font-medium text-xs shadow-none transition-colors",
          activeView === "local"
            ? "bg-blue-50 text-blue-700"
            : "text-gray-500 hover:text-gray-800"
        )}
        onClick={() => onViewChange("local")}
        title={getMessage("content_resultLocal")}
        type="button"
      >
        <Languages size={13} />
        <span className="sr-only">{getMessage("content_resultLocal")}</span>
      </button>
      {aiAvailable && (
        <button
          aria-pressed={activeView === "ai"}
          className={cn(
            "flex h-7 items-center gap-1 rounded-sm px-1.5 font-medium text-xs shadow-none transition-colors",
            activeView === "ai"
              ? "bg-violet-50 text-violet-700"
              : "text-gray-500 hover:text-gray-800"
          )}
          onClick={() => onViewChange("ai")}
          title={getMessage("content_resultAi")}
          type="button"
        >
          <Sparkles
            className={aiIsLoading ? "animate-pulse" : undefined}
            size={13}
          />
          <span>{getMessage("content_resultAi")}</span>
        </button>
      )}
    </fieldset>
  );
}
