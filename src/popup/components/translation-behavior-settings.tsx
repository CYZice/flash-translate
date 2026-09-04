import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ToggleSwitch } from "@/shared/components/toggle-switch";
import { useLanguageDetectorAvailability } from "@/shared/hooks/use-language-detector-availability";
import { getSettings, saveSettings } from "@/shared/storage/settings";
import { getMessage } from "@/shared/utils/i18n";

const CHROME_FLAGS_URL = "chrome://flags/#language-detection-api";

export function TranslationBehaviorSettings() {
  const [skipSameLanguage, setSkipSameLanguage] = useState(true);
  const [autoDetectLanguage, setAutoDetectLanguage] = useState(true);
  const [editorInputAssistEnabled, setEditorInputAssistEnabled] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const {
    availability: detectorAvailability,
    isChecking: isCheckingAvailability,
  } = useLanguageDetectorAvailability();

  useEffect(() => {
    const initialize = async () => {
      const settings = await getSettings();
      setSkipSameLanguage(settings.skipSameLanguage);
      setAutoDetectLanguage(settings.autoDetectLanguage);
      setEditorInputAssistEnabled(settings.editorInputAssistEnabled);
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

  const handleEditorInputAssistToggle = async () => {
    const newValue = !editorInputAssistEnabled;
    setEditorInputAssistEnabled(newValue);
    await saveSettings({ editorInputAssistEnabled: newValue });
  };

  const handleCopyFlagsUrl = async () => {
    await navigator.clipboard.writeText(CHROME_FLAGS_URL);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isDetectorUnavailable =
    detectorAvailability === "unavailable" ||
    detectorAvailability === "unsupported";
  const autoDetectEnabled = autoDetectLanguage && !isDetectorUnavailable;
  const effectiveSkipSameLanguage = autoDetectEnabled ? true : skipSameLanguage;

  return (
    <div>
      <div className="px-4 pt-3 pb-1">
        <h2 className="m-0 font-semibold text-gray-900 text-xs">
          {getMessage("popup_section_behavior")}
        </h2>
      </div>
      <div className="divide-y divide-gray-100 px-4">
        <div className="flex items-center justify-between py-3">
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
            checked={autoDetectEnabled}
            disabled={isDetectorUnavailable}
            onChange={handleAutoDetectToggle}
          />
        </div>
        <div className="flex items-center justify-between py-3">
          <div className="flex-1 pr-3">
            <span
              className={cn(
                "text-sm",
                autoDetectEnabled ? "text-gray-400" : "text-gray-700"
              )}
            >
              {getMessage("popup_behavior_skipSameLanguage")}
            </span>
            <p className="mt-0.5 text-gray-400 text-xs">
              {autoDetectEnabled
                ? getMessage("popup_behavior_skipSameLanguageAutoDetectNote")
                : getMessage("popup_behavior_skipSameLanguageDesc")}
            </p>
          </div>
          <ToggleSwitch
            checked={effectiveSkipSameLanguage}
            disabled={autoDetectEnabled}
            onChange={handleSkipSameLanguageToggle}
          />
        </div>
        <div className="flex items-center justify-between py-3">
          <div className="flex-1 pr-3">
            <span className="text-gray-700 text-sm">
              {getMessage("popup_behavior_editorInputAssist")}
            </span>
            <p className="mt-0.5 text-gray-400 text-xs">
              {getMessage("popup_behavior_editorInputAssistDesc")}
            </p>
          </div>
          <ToggleSwitch
            checked={editorInputAssistEnabled}
            onChange={handleEditorInputAssistToggle}
          />
        </div>
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
