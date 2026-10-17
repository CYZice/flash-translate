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
  const [editorInputAssistEnabled, setEditorInputAssistEnabled] =
    useState(false);
  const [selectionTrigger, setSelectionTrigger] = useState<
    "immediate" | "badge"
  >("badge");
  const [defaultTranslationProvider, setDefaultTranslationProvider] = useState<
    "chrome-built-in" | "custom-ai"
  >("chrome-built-in");
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
      setSelectionTrigger(settings.selectionTrigger ?? "badge");
      setDefaultTranslationProvider(
        settings.defaultTranslationProvider ?? "chrome-built-in"
      );
    };
    initialize();
  }, []);

  const handleSkipSameLanguageToggle = async () => {
    const newValue = !skipSameLanguage;
    setSkipSameLanguage(newValue);
    await saveSettings({ skipSameLanguage: newValue });
  };

  const handleSelectionTriggerChange = async (value: "immediate" | "badge") => {
    setSelectionTrigger(value);
    await saveSettings({ selectionTrigger: value });
  };

  const handleAutoDetectToggle = async () => {
    const newValue = !autoDetectLanguage;
    setAutoDetectLanguage(newValue);
    await saveSettings({ autoDetectLanguage: newValue });
  };

  const handleDefaultProviderChange = async (
    value: "chrome-built-in" | "custom-ai"
  ) => {
    setDefaultTranslationProvider(value);
    await saveSettings({ defaultTranslationProvider: value });
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
        <div className="py-3">
          <span className="text-gray-700 text-sm">选中文本后的翻译方式</span>
          <div className="mt-2 flex gap-2">
            {(
              [
                ["badge", "点击右下角图标"],
                ["immediate", "立即显示"],
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
          {defaultTranslationProvider === "custom-ai" && (
            <p className="mt-1 text-amber-600 text-xs">
              需要先在下方 AI 设置中配置接口和模型。
            </p>
          )}
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
