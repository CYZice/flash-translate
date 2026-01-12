import { ChevronRight, Loader2 } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/shared/constants/languages";
import { getMessage } from "@/shared/utils/i18n";

interface LanguageSelectorProps {
  sourceLanguage: string;
  targetLanguage: string;
  onSourceChange: (lang: string) => void;
  onTargetChange: (lang: string) => void;
  isDetecting?: boolean;
  isAutoDetected?: boolean;
}

export function LanguageSelector({
  sourceLanguage,
  targetLanguage,
  onSourceChange,
  onTargetChange,
  isDetecting = false,
  isAutoDetected = false,
}: LanguageSelectorProps) {
  return (
    <div className="flex items-stretch gap-1">
      <div className="relative flex items-stretch">
        {isDetecting && (
          <Loader2
            className="absolute left-0.5 animate-spin text-blue-400"
            size={10}
          />
        )}
        <select
          aria-label={getMessage("content_sourceLanguage")}
          className="flex min-h-8 min-w-10 cursor-pointer appearance-none items-center justify-center rounded border-none bg-white/70 px-2 text-center font-medium text-blue-700 text-xs backdrop-blur-sm transition-colors hover:bg-blue-50 hover:text-blue-900 focus:outline-none disabled:cursor-wait disabled:opacity-50"
          disabled={isDetecting}
          onChange={(e) => onSourceChange(e.target.value)}
          value={sourceLanguage}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.code.toUpperCase()}
              {isAutoDetected && lang.code === sourceLanguage ? " ✓" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-center border-none stroke-blue-400 text-center text-blue-400">
        <ChevronRight size={12} />
      </div>

      <select
        aria-label={getMessage("content_targetLanguage")}
        className="flex min-h-8 min-w-10 cursor-pointer appearance-none items-center justify-center rounded border-none bg-white/70 px-2 text-center font-medium text-blue-700 text-xs backdrop-blur-sm transition-colors hover:bg-blue-50 hover:text-blue-900 focus:outline-none"
        onChange={(e) => onTargetChange(e.target.value)}
        value={targetLanguage}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option
            disabled={lang.code === sourceLanguage}
            key={lang.code}
            value={lang.code}
          >
            {lang.code.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
