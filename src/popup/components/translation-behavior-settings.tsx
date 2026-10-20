import { useState } from "react";
import { cn } from "@/lib/utils";
import { ToggleSwitch } from "@/shared/components/toggle-switch";
import { useLanguageDetectorAvailability } from "@/shared/hooks/use-language-detector-availability";
import { useSettings } from "@/shared/hooks/use-settings";
import { saveSettings } from "@/shared/storage/settings";
import { selectTranslationBehaviorSettings } from "@/shared/storage/settings-selectors";
import { getMessage } from "@/shared/utils/i18n";
import { getPopupSettingsCopy } from "../utils/settings-copy";
import { ExclusionSettings } from "./exclusion-settings";
import { NativeModelSettings } from "./native-model-settings";

const CHROME_FLAGS_URL = "chrome://flags/#language-detection-api";

function skipDescription(autoZhEn: boolean, autoDetect: boolean): string {
  if (autoZhEn) {
    return getPopupSettingsCopy().automaticSkipNote;
  }
  return getMessage(
    autoDetect
      ? "popup_behavior_skipSameLanguageAutoDetectNote"
      : "popup_behavior_skipSameLanguageDesc"
  );
}

export function TranslationBehaviorSettings() {
  const copy = getPopupSettingsCopy();
  const [settings] = useSettings(selectTranslationBehaviorSettings);
  const autoZhEn = settings?.autoZhEn ?? false;
  const skipSameLanguage = settings?.skipSameLanguage ?? true;
  const autoDetectLanguage = settings?.autoDetectLanguage ?? true;
  const editorInputAssistEnabled = settings?.editorInputAssistEnabled ?? false;
  const selectionTrigger = settings?.selectionTrigger ?? "badge";
  const defaultTranslationProvider =
    settings?.defaultTranslationProvider ?? "chrome-built-in";
  const [isCopied, setIsCopied] = useState(false);
  const {
    availability: detectorAvailability,
    isChecking: isCheckingAvailability,
  } = useLanguageDetectorAvailability({
    enabled: settings !== null && !autoZhEn,
  });

  const handleSkipSameLanguageToggle = async () => {
    const newValue = !skipSameLanguage;
    await saveSettings({ skipSameLanguage: newValue });
  };

  const handleSelectionTriggerChange = async (value: "immediate" | "badge") => {
    await saveSettings({ selectionTrigger: value });
  };

  const handleAutoDetectToggle = async () => {
    const newValue = !autoDetectLanguage;
    await saveSettings({ autoDetectLanguage: newValue });
  };

  const handleDefaultProviderChange = async (
    value: "chrome-built-in" | "custom-ai"
  ) => {
    await saveSettings({ defaultTranslationProvider: value });
  };

  const handleEditorInputAssistToggle = async () => {
    const newValue = !editorInputAssistEnabled;
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
  const autoDetectEnabled =
    !autoZhEn && autoDetectLanguage && !isDetectorUnavailable;
  const effectiveSkipSameLanguage =
    !autoZhEn && (autoDetectEnabled || skipSameLanguage);
  const detectionDisabled = !settings || autoZhEn || isDetectorUnavailable;
  const skipDisabled = !settings || autoZhEn || autoDetectEnabled;

  return (
    <div>
      <div className="px-4 pt-3 pb-1">
        <h2 className="m-0 font-semibold text-gray-900 text-xs">
          {copy.behavior}
        </h2>
      </div>
      <div className="divide-y divide-gray-100 px-4">
        <div className="py-3">
          <span className="text-gray-700 text-sm">{copy.trigger}</span>
          <div className="mt-2 flex gap-2">
            {(
              [
                ["badge", copy.badge],
                ["immediate", copy.immediate],
              ] as const
            ).map(([value, label]) => (
              <button
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs",
                  selectionTrigger === value
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
                key={value}
                onClick={() => handleSelectionTriggerChange(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="py-3">
          <span className="text-gray-700 text-sm">默认翻译引擎</span>
          <div className="mt-2 flex gap-2">
            {(
              [
                ["chrome-built-in", "Chrome 内置翻译"],
                ["custom-ai", "AI 翻译"],
              ] as const
            ).map(([value, label]) => (
              <button
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs",
                  defaultTranslationProvider === value
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
                key={value}
                onClick={() => handleDefaultProviderChange(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <details className="py-3">
          <summary className="cursor-pointer text-gray-600 text-xs">
            {copy.advanced}
          </summary>
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 pr-3">
              <span
                className={cn(
                  "text-sm",
                  detectionDisabled ? "text-gray-400" : "text-gray-700"
                )}
              >
                {getMessage("popup_behavior_autoDetectLanguage")}
              </span>
              {autoZhEn ? (
                <p className="mt-0.5 text-gray-400 text-xs">
                  {copy.automaticDetectionNote}
                </p>
              ) : (
                <AutoDetectDescription
                  isCopied={isCopied}
                  isDetectorUnavailable={isDetectorUnavailable}
                  isLoading={isCheckingAvailability}
                  onCopyFlagsUrl={handleCopyFlagsUrl}
                />
              )}
            </div>
            <ToggleSwitch
              checked={autoDetectEnabled}
              ariaLabel={getMessage("popup_behavior_autoDetectLanguage")}
              disabled={detectionDisabled}
              onChange={handleAutoDetectToggle}
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 pr-3">
              <span
                className={cn(
                  "text-sm",
                  skipDisabled ? "text-gray-400" : "text-gray-700"
                )}
              >
                {getMessage("popup_behavior_skipSameLanguage")}
              </span>
              <p className="mt-0.5 text-gray-400 text-xs">
                {skipDescription(autoZhEn, autoDetectEnabled)}
              </p>
            </div>
            <ToggleSwitch
              checked={effectiveSkipSameLanguage}
              ariaLabel={getMessage("popup_behavior_skipSameLanguage")}
              disabled={skipDisabled}
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
          <ExclusionSettings />
        </details>
        {defaultTranslationProvider === "chrome-built-in" && (
          <NativeModelSettings />
        )}
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

  return null;
}
