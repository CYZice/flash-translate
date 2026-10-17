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
  const isAi = activeView === "ai" && aiAvailable;
  const currentLabel = isAi ? getMessage("content_resultAi") : "Chrome";
  const nextLabel = isAi ? "Chrome" : getMessage("content_resultAi");
  const label = aiAvailable
    ? getMessage("content_switchTranslationProvider", [currentLabel, nextLabel])
    : getMessage("content_resultLocal");

  return (
    <button
      aria-label={label}
      aria-busy={isAi && aiIsLoading}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-sm p-0 shadow-none transition-colors disabled:cursor-default",
        isAi ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"
      )}
      disabled={!aiAvailable}
      onClick={() => onViewChange(isAi ? "local" : "ai")}
      title={label}
      type="button"
    >
      {isAi ? (
        <Sparkles
          aria-hidden="true"
          className={aiIsLoading ? "animate-pulse" : undefined}
          size={13}
        />
      ) : (
        <Languages aria-hidden="true" size={13} />
      )}
    </button>
  );
}
