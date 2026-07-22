import { Ban, X } from "lucide-react";
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

  const handleCancel = () => {
    setIsConfirming(false);
  };

  return (
    <>
      <Button
        aria-label={getMessage("content_temporarilyDisablePage")}
        onClick={handleClick}
        title={getMessage("content_temporarilyDisablePage")}
        variant="danger"
      >
        <Ban size={14} />
      </Button>
      {isConfirming && (
        <div
          aria-labelledby={dialogTitleId}
          aria-modal="true"
          className="absolute inset-0 z-50 flex animate-dialog-slide-in items-stretch justify-between bg-white/90 px-3"
          role="dialog"
        >
          <span
            className="flex items-center text-gray-600 text-xs"
            id={dialogTitleId}
          >
            {getMessage("content_confirmTemporaryDisable")}
          </span>
          <div className="flex items-stretch gap-2 py-0">
            <Button
              className="min-w-auto px-2 text-xs"
              onClick={handleConfirm}
              ref={confirmButtonRef}
              variant="destructive"
            >
              {getMessage("content_disable")}
            </Button>
            <Button
              aria-label={getMessage("content_cancel")}
              className="bg-transparent"
              onClick={handleCancel}
              variant="muted"
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
