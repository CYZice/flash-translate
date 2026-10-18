import { Pin, PinOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/button";
import { saveSettings } from "@/shared/storage/settings";
import { getMessage } from "@/shared/utils/i18n";
import type { HoveredTermTranslationState } from "../term-translation/use-hovered-term-translation";
import { LanguageSelector } from "./language-selector";
import { TermTranslationStatus } from "./term-translation-status";
import {
  TranslationResultSwitch,
  type TranslationResultView,
} from "./translation-result-switch";

interface TranslationCardHeaderProps {
  sourceLanguage: string;
  targetLanguage: string;
  detectedLanguage: string | null;
  isDetecting: boolean;
  autoDetectEnabled: boolean;
  autoZhEn: boolean;
  activeResultView: TranslationResultView;
  aiAvailable: boolean;
  aiIsLoading: boolean;
  termTranslation: HoveredTermTranslationState;
  isDragging: boolean;
  isPinned: boolean;
  onClose: () => void;
  onPinToggle: () => void;
  onMovePointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onResultViewChange: (view: TranslationResultView) => void;
  onSourceLanguageOverride: (lang: string | null) => void;
}

export function TranslationCardHeader({
  sourceLanguage,
  targetLanguage,
  detectedLanguage,
  isDetecting,
  autoDetectEnabled,
  autoZhEn,
  activeResultView,
  aiAvailable,
  aiIsLoading,
  termTranslation,
  isDragging,
  onClose,
  onMovePointerDown,
  onResultViewChange,
  onSourceLanguageOverride,
  isPinned,
  onPinToggle,
}: TranslationCardHeaderProps) {
  const onSourceChange = async (lang: string) => {
    // When auto-detect is enabled, override the detected language
    if (autoDetectEnabled) {
      onSourceLanguageOverride(lang);
    } else {
      await saveSettings({ sourceLanguage: lang, autoZhEn: false });
      onSourceLanguageOverride(lang);
    }
  };

  const onTargetChange = async (lang: string) => {
    if (autoZhEn) {
      onSourceLanguageOverride(sourceLanguage);
      await saveSettings({
        targetLanguage: lang,
        sourceLanguage,
        autoZhEn: false,
      });
    } else {
      await saveSettings({ targetLanguage: lang });
    }
  };

  if (termTranslation.hoveredTerm) {
    return (
      <div
        className={cn(
          "flex min-h-9 shrink-0 touch-none items-center border-gray-100 border-b bg-white px-3",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerDown={onMovePointerDown}
      >
        <TermTranslationStatus state={termTranslation} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-9 shrink-0 touch-none items-center justify-between gap-1 border-gray-100 border-b bg-white px-2",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      onPointerDown={onMovePointerDown}
    >
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
        <TranslationResultSwitch
          activeView={activeResultView}
          aiAvailable={aiAvailable}
          aiIsLoading={aiIsLoading}
          onViewChange={onResultViewChange}
        />
        <Button
          aria-label={isPinned ? "取消钉住翻译卡片" : "钉住翻译卡片"}
          aria-pressed={isPinned}
          className={cn(
            "min-h-7 min-w-7 rounded-sm p-0 shadow-none",
            isPinned && "bg-amber-50 text-amber-700"
          )}
          onClick={onPinToggle}
          tooltip={isPinned ? "取消钉住" : "钉住"}
          tooltipAlign="end"
          variant="default"
        >
          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
        </Button>
        <Button
          aria-label={getMessage("content_close")}
          className="min-h-7 min-w-7 rounded-sm p-0 shadow-none"
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
