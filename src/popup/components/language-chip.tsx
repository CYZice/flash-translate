import { cn } from "@/lib/utils";
import {
  getLanguageNativeName,
  getLanguageUpperCode,
} from "@/shared/constants/languages";
import type { DownloadStatus } from "../hooks/download-state";
import { StatusIndicator } from "./status-indicator";

export interface LanguageChipProps {
  languageCode: string;
  isSelected: boolean;
  status: DownloadStatus;
  onClick: () => void;
}

export function LanguageChip({
  languageCode,
  isSelected,
  status,
  onClick,
}: LanguageChipProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-7 items-center gap-1 rounded px-2 py-1 font-medium text-xs transition-colors duration-150",
        isSelected
          ? "bg-blue-600 text-white"
          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      )}
      onClick={onClick}
      title={getLanguageNativeName(languageCode)}
      type="button"
    >
      <span>{getLanguageUpperCode(languageCode)}</span>
      <StatusIndicator status={status} />
    </button>
  );
}
