import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getLanguageNativeName } from "@/shared/constants/languages";
import { getMessage } from "@/shared/utils/i18n";
import type { TranslationAvailabilityStatus } from "@/shared/utils/translator";
import {
  calculateDropdownPosition,
  type DropdownPosition,
} from "../hooks/dropdown-position";
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

export function LanguageDownloadDropdown({
  downloadableLanguages,
  onDownload,
  tooltipAvailable,
  tooltipNone,
}: LanguageDownloadDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition>("left");
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate dropdown position to avoid overflow
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition(calculateDropdownPosition(rect, window.innerWidth));
    }
  }, [isOpen]);

  // Handle Escape key to close dropdown
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const handleDownloadClick = (languageCode: string) => {
    onDownload(languageCode);
    setIsOpen(false);
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
          "inline-flex h-7 w-7 items-center justify-center rounded border border-dashed transition-all duration-150",
          hasDownloadableLanguages
            ? "border-blue-400 text-blue-500 hover:bg-blue-50"
            : "cursor-not-allowed border-gray-300 text-gray-400"
        )}
        disabled={!hasDownloadableLanguages}
        onClick={() => setIsOpen(!isOpen)}
        ref={buttonRef}
        title={hasDownloadableLanguages ? availableTooltip : noneTooltip}
        type="button"
      >
        +
      </button>

      {isOpen && hasDownloadableLanguages && (
        <>
          {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Backdrop click to close */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Backdrop overlay */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard handled by document-level Escape key listener */}
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
          <div
            className={cn(
              "absolute top-full z-10 mt-1 max-h-48 min-w-32 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg",
              "fade-in-0 slide-in-from-top-2 animate-in duration-150",
              position === "left" ? "left-0" : "right-0"
            )}
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
        </>
      )}
    </div>
  );
}
