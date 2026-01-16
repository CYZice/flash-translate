import { useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { getLanguageNativeName } from "@/shared/constants/languages";
import { getMessage } from "@/shared/utils/i18n";
import type { TranslationAvailabilityStatus } from "@/shared/utils/translator";
import { StatusIndicator } from "./status-indicator";

export interface DownloadableLanguage {
  code: string;
  status: TranslationAvailabilityStatus;
}

export interface LanguageDownloadDropdownProps {
  downloadableLanguages: DownloadableLanguage[];
  onDownload: (languageCode: string) => void;
  tooltipAvailable?: string;
  tooltipNone?: string;
}

/**
 * Language download dropdown using Popover API + CSS Anchor Positioning.
 *
 * Benefits over the previous implementation:
 * - No useState for open/close (automatic via Popover API)
 * - No useEffect for Escape key (automatic)
 * - No backdrop overlay for click-outside (Light Dismiss)
 * - No JS position calculation (CSS Anchor Positioning)
 */
export function LanguageDownloadDropdown({
  downloadableLanguages,
  onDownload,
  tooltipAvailable,
  tooltipNone,
}: LanguageDownloadDropdownProps) {
  const popoverId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleDownloadClick = (languageCode: string) => {
    onDownload(languageCode);
    // Close popover after selection
    popoverRef.current?.hidePopover();
  };

  const hasDownloadableLanguages = downloadableLanguages.length > 0;

  const availableTooltip =
    tooltipAvailable ||
    getMessage(
      "popup_source_languagesAvailable",
      String(downloadableLanguages.length)
    );
  const noneTooltip = tooltipNone || getMessage("popup_source_noLanguages");

  return (
    <div className="relative">
      <button
        className={cn(
          "download-dropdown-anchor inline-flex h-7 w-7 items-center justify-center rounded border border-dashed transition-all duration-150",
          hasDownloadableLanguages
            ? "border-blue-400 text-blue-500 hover:bg-blue-50"
            : "cursor-not-allowed border-gray-300 text-gray-400"
        )}
        disabled={!hasDownloadableLanguages}
        popoverTarget={hasDownloadableLanguages ? popoverId : undefined}
        title={hasDownloadableLanguages ? availableTooltip : noneTooltip}
        type="button"
      >
        +
      </button>

      {hasDownloadableLanguages && (
        <div
          className="download-dropdown-popover max-h-48 min-w-32 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          id={popoverId}
          popover="auto"
          ref={popoverRef}
        >
          {downloadableLanguages.map((lang) => (
            <button
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
              key={lang.code}
              onClick={() => handleDownloadClick(lang.code)}
              type="button"
            >
              <span>{getLanguageNativeName(lang.code)}</span>
              <StatusIndicator status="after-download" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
