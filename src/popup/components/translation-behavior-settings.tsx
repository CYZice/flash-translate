import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getSettings, saveSettings } from "@/shared/storage/settings";
import { getMessage } from "@/shared/utils/i18n";
import {
  type LanguageDetectionAvailability,
  languageDetectorManager,
} from "@/shared/utils/language-detector";
import { ToggleSwitch } from "./toggle-switch";

const CHROME_FLAGS_URL = "chrome://flags/#language-detection-api";

export function TranslationBehaviorSettings() {
  const [skipSameLanguage, setSkipSameLanguage] = useState(true);
  const [autoDetectLanguage, setAutoDetectLanguage] = useState(true);
  const [detectorAvailability, setDetectorAvailability] =
    useState<LanguageDetectionAvailability>("available");
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      setIsCheckingAvailability(true);
      const [settings, availability] = await Promise.all([
        getSettings(),
        languageDetectorManager.checkAvailability(),
      ]);
      setSkipSameLanguage(settings.skipSameLanguage);
      setAutoDetectLanguage(settings.autoDetectLanguage);
      setDetectorAvailability(availability);
      setIsCheckingAvailability(false);
    };
    initialize();
  }, []);

  const handleSkipSameLanguageToggle = async () => {
    const newValue = !skipSameLanguage;
    setSkipSameLanguage(newValue);
    await saveSettings({ skipSameLanguage: newValue });
  };

  const handleAutoDetectToggle = async () => {
    const newValue = !autoDetectLanguage;
    setAutoDetectLanguage(newValue);
    await saveSettings({ autoDetectLanguage: newValue });
  };

  const handleCopyFlagsUrl = async () => {
    await navigator.clipboard.writeText(CHROME_FLAGS_URL);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isDetectorUnavailable =
    detectorAvailability === "unavailable" ||
    detectorAvailability === "unsupported";

  return (
    <div className="border-gray-100 border-t px-3 py-2.5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex-1 pr-3">
          <span
            className={cn(
              "text-sm",
              isDetectorUnavailable ? "text-gray-400" : "text-gray-700"
            )}
          >
            {getMessage("popup_behavior_autoDetectLanguage")}
          </span>
          <AutoDetectDescription
            isCopied={isCopied}
            isDetectorUnavailable={isDetectorUnavailable}
            isLoading={isCheckingAvailability}
            onCopyFlagsUrl={handleCopyFlagsUrl}
          />
        </div>
        <ToggleSwitch
          checked={autoDetectLanguage && !isDetectorUnavailable}
          disabled={isDetectorUnavailable}
          onChange={handleAutoDetectToggle}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1 pr-3">
          <span
            className={cn(
              "text-sm",
              autoDetectLanguage ? "text-gray-400" : "text-gray-700"
            )}
          >
            {getMessage("popup_behavior_skipSameLanguage")}
          </span>
          <p className="mt-0.5 text-gray-400 text-xs">
            {autoDetectLanguage
              ? getMessage("popup_behavior_skipSameLanguageAutoDetectNote")
              : getMessage("popup_behavior_skipSameLanguageDesc")}
          </p>
        </div>
        <ToggleSwitch
          checked={skipSameLanguage}
          disabled={autoDetectLanguage}
          onChange={handleSkipSameLanguageToggle}
        />
      </div>
    </div>
  );
}

interface AutoDetectDescriptionProps {
  isLoading: boolean;
  isDetectorUnavailable: boolean;
  isCopied: boolean;
  onCopyFlagsUrl: () => void;
}

function AutoDetectDescription({
  isLoading,
  isDetectorUnavailable,
  isCopied,
  onCopyFlagsUrl,
}: AutoDetectDescriptionProps) {
  if (isLoading) {
    return <p className="mt-0.5 text-gray-400 text-xs">...</p>;
  }

  if (isDetectorUnavailable) {
    return (
      <div className="mt-1">
        <p className="text-amber-600 text-xs">
          {getMessage("popup_behavior_autoDetectUnavailable")}
        </p>
        <button
          className={cn(
            "mt-1 text-xs underline",
            isCopied ? "text-green-500" : "text-blue-500 hover:text-blue-600"
          )}
          onClick={onCopyFlagsUrl}
          title={CHROME_FLAGS_URL}
          type="button"
        >
          {isCopied
            ? getMessage("popup_behavior_autoDetectCopied")
            : getMessage("popup_behavior_autoDetectEnableFlag")}
        </button>
      </div>
    );
  }

  return (
    <p className="mt-0.5 text-gray-400 text-xs">
      {getMessage("popup_behavior_autoDetectLanguageDesc")}
    </p>
  );
}
