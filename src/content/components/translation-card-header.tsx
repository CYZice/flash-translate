import { Settings, X } from "lucide-react";
import { Button } from "@/shared/components/button";
import { OPEN_SETTINGS_MESSAGE } from "@/shared/constants/runtime-messages";
import { saveSettings } from "@/shared/storage/settings";
import { getMessage } from "@/shared/utils/i18n";
import { createPrefixedLogger } from "@/shared/utils/logger";
import { LanguageSelector } from "./language-selector";
import { TemporaryDisableButton } from "./temporary-disable-button";

const log = createPrefixedLogger("TranslationCardHeader");

interface TranslationCardHeaderProps {
  sourceLanguage: string;
  targetLanguage: string;
  detectedLanguage: string | null;
  isDetecting: boolean;
  autoDetectEnabled: boolean;
  onClose: () => void;
  onDisablePage: () => void;
  onSourceLanguageOverride: (lang: string | null) => void;
}

export function TranslationCardHeader({
  sourceLanguage,
  targetLanguage,
  detectedLanguage,
  isDetecting,
  autoDetectEnabled,
  onClose,
  onDisablePage,
  onSourceLanguageOverride,
}: TranslationCardHeaderProps) {
  const onOpenSettings = () => {
    chrome.runtime
      .sendMessage(OPEN_SETTINGS_MESSAGE)
      .catch((error) => log.error("Failed to request options page:", error));
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

  return (
    <div className="sticky top-0 z-10 flex min-h-8 items-center justify-between rounded-t-xl border-b border-none px-3">
      <LanguageSelector
        isAutoDetected={autoDetectEnabled && detectedLanguage !== null}
        isDetecting={isDetecting}
        onSourceChange={onSourceChange}
        onTargetChange={onTargetChange}
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
      />
      <div className="flex items-stretch gap-1">
        <TemporaryDisableButton onDisabled={onDisablePage} />
        <Button
          aria-label={getMessage("content_openSettings")}
          onClick={onOpenSettings}
          variant="default"
        >
          <Settings size={14} />
        </Button>
        <Button
          aria-label={getMessage("content_close")}
          onClick={onClose}
          variant="muted"
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
}
