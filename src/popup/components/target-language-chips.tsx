import { useEffect, useRef, useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/shared/constants/languages";
import { getMessage } from "@/shared/utils/i18n";
import { createPrefixedLogger } from "@/shared/utils/logger";
import {
  type TranslationAvailabilityStatus,
  translatorManager,
} from "@/shared/utils/translator";
import { useDownloadState } from "../hooks/use-download-state";
import { LanguageChip } from "./language-chip";
import { LanguageDownloadDropdown } from "./language-download-dropdown";

const log = createPrefixedLogger("TargetLanguageChips");

interface TargetLanguageStatus {
  code: string;
  status: TranslationAvailabilityStatus;
}

interface TargetLanguageChipsProps {
  targetLanguage: string;
  onChangeTargetLanguage: (code: string) => void;
}

export function TargetLanguageChips({
  targetLanguage,
  onChangeTargetLanguage,
}: TargetLanguageChipsProps) {
  const [statuses, setStatuses] = useState<TargetLanguageStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getStatus, startDownload, finishDownload, clearDownloadError } =
    useDownloadState();

  // Track error clear timeouts for cleanup
  const errorTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Cleanup all pending timeouts on unmount
  useEffect(() => {
    const timeouts = errorTimeoutsRef.current;
    return () => {
      for (const timeout of timeouts.values()) {
        clearTimeout(timeout);
      }
      timeouts.clear();
    };
  }, []);

  // Check availability for all target languages
  useEffect(() => {
    const checkAllTargets = async () => {
      setIsLoading(true);
      const results = await Promise.all(
        SUPPORTED_LANGUAGES.map(async (lang) => {
          // Check if English → target is available (as a representative pair)
          const sourceToCheck = lang.code === "en" ? "ja" : "en";
          const status = await translatorManager.checkAvailability(
            sourceToCheck,
            lang.code
          );
          return { code: lang.code, status };
        })
      );
      setStatuses(results);
      setIsLoading(false);
    };
    checkAllTargets();
  }, []);

  const availableStatuses = statuses.filter((s) => s.status === "available");
  const downloadableStatuses = statuses.filter(
    (s) => s.status === "after-download"
  );

  // Convert statuses to pairs format for useDownloadState compatibility
  const convertToPairs = (targetLangStatuses: TargetLanguageStatus[]) => {
    return targetLangStatuses.map((s) => {
      const sourceToCheck = s.code === "en" ? "ja" : "en";
      return {
        sourceLanguage: sourceToCheck,
        targetLanguage: s.code,
        status: s.status,
      };
    });
  };

  const handleDownload = async (targetLang: string) => {
    const sourceToCheck = targetLang === "en" ? "ja" : "en";
    const pairKey = `${sourceToCheck}-${targetLang}`;

    // Clear any existing timeout for this pair
    const existingTimeout = errorTimeoutsRef.current.get(pairKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      errorTimeoutsRef.current.delete(pairKey);
    }

    startDownload(sourceToCheck, targetLang);

    try {
      await translatorManager.getTranslator(sourceToCheck, targetLang);
      // Re-check all targets after successful download
      const results = await Promise.all(
        SUPPORTED_LANGUAGES.map(async (lang) => {
          const source = lang.code === "en" ? "ja" : "en";
          const status = await translatorManager.checkAvailability(
            source,
            lang.code
          );
          return { code: lang.code, status };
        })
      );
      setStatuses(results);
      finishDownload(sourceToCheck, targetLang, false);
    } catch (error) {
      log.error("Download failed:", error);
      finishDownload(sourceToCheck, targetLang, true);

      // Auto-clear error after 5 seconds with proper cleanup tracking
      const timeoutId = setTimeout(() => {
        clearDownloadError(sourceToCheck, targetLang);
        errorTimeoutsRef.current.delete(pairKey);
      }, 5000);
      errorTimeoutsRef.current.set(pairKey, timeoutId);
    }
  };

  if (isLoading) {
    return (
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">
            {getMessage("popup_target_label")}
          </span>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
            <span className="text-gray-400 text-xs">
              {getMessage("popup_target_loading")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const pairs = convertToPairs(statuses);

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-gray-500 text-xs">
          {getMessage("popup_target_label")}
        </span>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {availableStatuses.map((langStatus) => {
            const sourceToCheck = langStatus.code === "en" ? "ja" : "en";
            return (
              <LanguageChip
                isSelected={langStatus.code === targetLanguage}
                key={langStatus.code}
                languageCode={langStatus.code}
                onClick={() => onChangeTargetLanguage(langStatus.code)}
                status={getStatus(sourceToCheck, langStatus.code, pairs)}
              />
            );
          })}
          <LanguageDownloadDropdown
            downloadableLanguages={downloadableStatuses.map((s) => ({
              code: s.code,
              status: s.status,
            }))}
            onDownload={handleDownload}
            tooltipAvailable={getMessage(
              "popup_target_languagesAvailable",
              String(downloadableStatuses.length)
            )}
            tooltipNone={getMessage("popup_target_noLanguages")}
          />
        </div>
      </div>
    </div>
  );
}
