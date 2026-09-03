import { getMessage } from "@/shared/utils/i18n";
import type { TranslationAvailabilityStatus } from "@/shared/utils/translator";

interface TranslationContentProps {
  availability: TranslationAvailabilityStatus;
  sourceLanguage: string;
  targetLanguage: string;
  isLoading: boolean;
  result: string | null;
  error: Error | null;
}

export function TranslationContent({
  availability,
  sourceLanguage,
  targetLanguage,
  isLoading,
  result,
  error,
}: TranslationContentProps) {
  if (availability === "unsupported") {
    return (
      <div className="rounded-md bg-red-50 px-3 py-2 text-red-600 text-sm">
        {getMessage("content_translatorUnsupported")}
      </div>
    );
  }

  if (availability === "unavailable") {
    return (
      <div className="rounded-md bg-red-50 px-3 py-2 text-red-600 text-sm">
        {getMessage("content_translationUnavailable", [
          sourceLanguage,
          targetLanguage,
        ])}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 px-3 py-2 text-red-600 text-sm">
        {error.message}
      </div>
    );
  }

  if (isLoading && !result) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        <span className="text-gray-500 text-sm">
          {availability === "after-download"
            ? getMessage("content_downloadingModel")
            : getMessage("content_translating")}
        </span>
      </div>
    );
  }

  return (
    <div className="wrap-break-word whitespace-pre-wrap text-[18px] text-gray-800 leading-8">
      {result || (
        <span className="text-gray-400 italic">
          {getMessage("content_translationPlaceholder")}
        </span>
      )}
    </div>
  );
}
