import { Settings, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/button";
import { saveSettings } from "@/shared/storage/settings";
import { getMessage } from "@/shared/utils/i18n";
import type { HoveredTermTranslationState } from "../term-translation/use-hovered-term-translation";
import { LanguageSelector } from "./language-selector";
import {
  TemporaryDisableButton,
  TemporaryDisableConfirmation,
} from "./temporary-disable-button";
import { TermTranslationStatus } from "./term-translation-status";

interface TranslationCardHeaderProps {
  sourceLanguage: string;
  targetLanguage: string;
  detectedLanguage: string | null;
  isDetecting: boolean;
  autoDetectEnabled: boolean;
  isSettingsOpen: boolean;
  termTranslation: HoveredTermTranslationState;
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
  termTranslation,
  onClose,
  onDisablePage,
  onSettingsToggle,
  onSourceLanguageOverride,
}: TranslationCardHeaderProps) {
  const [isConfirmingDisable, setIsConfirmingDisable] = useState(false);

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

  if (isConfirmingDisable) {
    return (
      <div className="sticky top-0 z-10 flex min-h-8 items-center rounded-t-xl px-3">
        <TemporaryDisableConfirmation
          onCancel={() => setIsConfirmingDisable(false)}
          onDisabled={onDisablePage}
        />
      </div>
    );
  }

  if (termTranslation.hoveredTerm) {
    return (
      <div className="sticky top-0 z-10 min-h-8 rounded-t-xl px-3">
        <TermTranslationStatus state={termTranslation} />
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-10 flex min-h-8 items-center justify-between gap-2 rounded-t-xl border-b border-none px-3">
      <div className="min-w-0 flex-1">
        <LanguageSelector
          isAutoDetected={autoDetectEnabled && detectedLanguage !== null}
          isDetecting={isDetecting}
          onSourceChange={onSourceChange}
          onTargetChange={onTargetChange}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
        />
      </div>
      <div className="flex shrink-0 items-stretch gap-1">
        <Button
          aria-controls="translation-card-body"
          aria-expanded={isSettingsOpen}
          aria-label={getMessage("content_toggleSettings")}
          aria-pressed={isSettingsOpen}
          className={isSettingsOpen ? "bg-blue-50 text-blue-600" : undefined}
          onClick={onSettingsToggle}
          tooltip={getMessage("content_toggleSettings")}
          tooltipAlign="end"
          variant="default"
        >
          <Settings size={14} />
        </Button>
        <TemporaryDisableButton
          onConfirm={() => setIsConfirmingDisable(true)}
        />
        <Button
          aria-label={getMessage("content_close")}
          onClick={onClose}
          tooltip={getMessage("content_close")}
          tooltipAlign="end"
          variant="muted"
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
}
