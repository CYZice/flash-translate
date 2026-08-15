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

interface TemporaryDisableActionProps {
  onCancel: () => void;
  onDisabled: () => void;
}

export function TemporaryDisableAction({
  onCancel,
  onDisabled,
}: TemporaryDisableActionProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

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
    <Button
      className="ml-auto shrink-0 animate-dialog-slide-in whitespace-nowrap px-2 text-xs"
      data-flash-translate-temporary-disable-action=""
      onClick={onDisabled}
      ref={confirmButtonRef}
      variant="destructive"
    >
      {getMessage("content_hideTranslationsUntilReload")}
    </Button>
  );
}
