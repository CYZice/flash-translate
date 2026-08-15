import { Pause } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/shared/components/button";
import { getMessage } from "@/shared/utils/i18n";

interface TemporaryDisableButtonProps {
  onConfirm: () => void;
}

export function TemporaryDisableButton({
  onConfirm,
}: TemporaryDisableButtonProps) {
  return (
    <Button
      aria-label={getMessage("content_pauseTranslationOnPage")}
      onClick={onConfirm}
      tooltip={getMessage("content_pauseTranslationOnPage")}
      tooltipAlign="end"
      variant="danger"
    >
      <Pause size={14} />
    </Button>
  );
}

interface TemporaryDisableConfirmationProps {
  onCancel: () => void;
  onDisabled: () => void;
}

export function TemporaryDisableConfirmation({
  onCancel,
  onDisabled,
}: TemporaryDisableConfirmationProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const dialogTitleId = "temporary-disable-dialog-title";

  useEffect(() => {
    confirmButtonRef.current?.focus();
    const resetTimer = window.setTimeout(onCancel, 8000);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(resetTimer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div
      aria-labelledby={dialogTitleId}
      className="flex min-w-0 flex-1 animate-dialog-slide-in items-center gap-2"
      role="dialog"
    >
      <span
        className="min-w-0 flex-1 text-gray-600 text-xs leading-4"
        id={dialogTitleId}
      >
        {getMessage("content_confirmPauseTranslationOnPage")}
      </span>
      <Button
        className="shrink-0 whitespace-nowrap px-2 text-xs"
        onClick={onDisabled}
        ref={confirmButtonRef}
        variant="destructive"
      >
        {getMessage("content_pause")}
      </Button>
    </div>
  );
}
