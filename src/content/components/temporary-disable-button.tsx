import { Pause } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/button";
import { getMessage } from "@/shared/utils/i18n";

interface TemporaryDisableButtonProps {
  onDisabled: () => void;
}

export function TemporaryDisableButton({
  onDisabled,
}: TemporaryDisableButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const dialogTitleId = "temporary-disable-dialog-title";

  const handleClick = () => {
    setIsConfirming(true);
  };

  useEffect(() => {
    if (!isConfirming) {
      return;
    }

    confirmButtonRef.current?.focus();
    const resetTimer = window.setTimeout(() => setIsConfirming(false), 8000);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsConfirming(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(resetTimer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isConfirming]);

  const handleConfirm = () => {
    onDisabled();
  };

  return (
    <>
      <Button
        aria-label={getMessage("content_pauseTranslationOnPage")}
        onClick={handleClick}
        title={getMessage("content_pauseTranslationOnPage")}
        variant="danger"
      >
        <Pause size={14} />
      </Button>
      {isConfirming && (
        <div
          aria-labelledby={dialogTitleId}
          aria-modal="true"
          className="absolute inset-0 z-50 flex animate-dialog-slide-in items-center gap-2 px-3 backdrop-blur-md"
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
            onClick={handleConfirm}
            ref={confirmButtonRef}
            variant="destructive"
          >
            {getMessage("content_pause")}
          </Button>
        </div>
      )}
    </>
  );
}
