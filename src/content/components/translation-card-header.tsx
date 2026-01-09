import { Settings, X } from "lucide-react";
import { saveSettings } from "@/shared/storage/settings";
import { getMessage } from "@/shared/utils/i18n";
import { ExcludeSiteButton } from "./exclude-site-button";
import { LanguageSelector } from "./language-selector";

interface TranslationCardHeaderProps {
  sourceLanguage: string;
  targetLanguage: string;
  detectedLanguage: string | null;
  isDetecting: boolean;
  autoDetectEnabled: boolean;
  onClose: () => void;
  onExcludeSite: () => void;
  onSourceLanguageOverride: (lang: string | null) => void;
}

export function TranslationCardHeader({
  sourceLanguage,
  targetLanguage,
  detectedLanguage,
  isDetecting,
  autoDetectEnabled,
  onClose,
  onExcludeSite,
  onSourceLanguageOverride,
}: TranslationCardHeaderProps) {
  const onOpenSettings = () => {
    const settingsUrl = chrome.runtime.getURL("src/popup/index.html");
    window.open(settingsUrl, "_blank");
  };

  const onSourceChange = async (lang: string) => {
    // When auto-detect is enabled, override the detected language
    if (autoDetectEnabled) {
      onSourceLanguageOverride(lang);
    } else {
      await saveSettings({ sourceLanguage: lang });
    }
  };

  const onTargetChange = async (lang: string) => {
    await saveSettings({ targetLanguage: lang });
  };

  const onSwap = async () => {
    await saveSettings({
      sourceLanguage: targetLanguage,
      targetLanguage: sourceLanguage,
    });
  };

  return (
    <div className="relative flex min-h-10 items-stretch justify-between rounded-t-xl border-b border-none px-3">
      <LanguageSelector
        isAutoDetected={autoDetectEnabled && detectedLanguage !== null}
        isDetecting={isDetecting}
        onSourceChange={onSourceChange}
        onSwap={onSwap}
        onTargetChange={onTargetChange}
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
      />
      <div className="flex items-stretch">
        <ExcludeSiteButton onExcluded={onExcludeSite} />
        <button
          aria-label={getMessage("content_openSettings")}
          className="flex min-w-10 cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-center text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
          onClick={onOpenSettings}
          type="button"
        >
          <Settings size={14} />
        </button>
        <button
          aria-label={getMessage("content_close")}
          className="flex min-w-10 cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-center text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          onClick={onClose}
          type="button"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
