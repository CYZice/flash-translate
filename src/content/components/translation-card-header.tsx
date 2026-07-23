import { Settings, X } from "lucide-react";
import { Button } from "@/shared/components/button";
import { saveSettings } from "@/shared/storage/settings";
import { getMessage } from "@/shared/utils/i18n";
import { LanguageSelector } from "./language-selector";
import { TemporaryDisableButton } from "./temporary-disable-button";

interface TranslationCardHeaderProps {
  sourceLanguage: string;
  targetLanguage: string;
  detectedLanguage: string | null;
  isDetecting: boolean;
  autoDetectEnabled: boolean;
  isSettingsOpen: boolean;
  onClose: () => void;
  onDisablePage: () => void;
  onSettingsToggle: () => void;
  onSourceLanguageOverride: (lang: string | null) => void;
}

export function TranslationCardHeader({
  sourceLanguage,
  targetLanguage,
  detectedLanguage,
  isDetecting,
  autoDetectEnabled,
  isSettingsOpen,
  onClose,
  onDisablePage,
  onSettingsToggle,
  onSourceLanguageOverride,
}: TranslationCardHeaderProps) {
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
        <Button
          aria-controls="translation-card-body"
          aria-expanded={isSettingsOpen}
          aria-label={getMessage("content_toggleSettings")}
          aria-pressed={isSettingsOpen}
          className={isSettingsOpen ? "bg-blue-50 text-blue-600" : undefined}
          onClick={onSettingsToggle}
          variant="default"
        >
          <Settings size={14} />
        </Button>
        <TemporaryDisableButton onDisabled={onDisablePage} />
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
