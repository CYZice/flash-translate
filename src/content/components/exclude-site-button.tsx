import { Ban, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/button";
import {
  generatePatternId,
  getSettings,
  saveSettings,
} from "@/shared/storage/settings";
import { getMessage } from "@/shared/utils/i18n";

interface ExcludeSiteButtonProps {
  onExcluded: () => void;
}

export function ExcludeSiteButton({ onExcluded }: ExcludeSiteButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const dialogTitleId = "exclude-site-dialog-title";

  const handleClick = () => {
    setIsConfirming(true);
    // Auto-reset after 3 seconds
    setTimeout(() => setIsConfirming(false), 8000);
  };

  // Focus confirm button when dialog opens and handle Escape key
  useEffect(() => {
    if (!isConfirming) {
      return;
    }

    if (confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsConfirming(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isConfirming]);

  const handleConfirm = async () => {
    const currentOrigin = window.location.origin;
    const settings = await getSettings();
    const newPattern = {
      id: generatePatternId(),
      pattern: currentOrigin,
      enabled: true,
    };
    await saveSettings({
      exclusionPatterns: [newPattern, ...settings.exclusionPatterns],
    });
    onExcluded();
  };

  const handleCancel = () => {
    setIsConfirming(false);
  };

  return (
    <>
      <Button
        aria-label={getMessage("content_excludeSite")}
        onClick={handleClick}
        title={getMessage("content_excludeSite")}
        variant="danger"
      >
        <Ban size={14} />
      </Button>
      {isConfirming && (
        <div
          aria-labelledby={dialogTitleId}
          aria-modal="true"
          className="absolute inset-0 z-50 flex animate-dialog-slide-in items-stretch justify-between bg-white px-3"
          role="dialog"
        >
          <span
            className="flex items-center text-gray-600 text-xs"
            id={dialogTitleId}
          >
            {getMessage("content_disableOnSite")}
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
