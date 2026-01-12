import { Ban, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    setTimeout(() => setIsConfirming(false), 3000);
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
      <button
        aria-label={getMessage("content_excludeSite")}
        className="flex min-w-10 cursor-pointer items-center justify-center rounded border-none bg-white/70 p-1 text-gray-400 backdrop-blur-sm transition-colors hover:bg-red-200 hover:text-red-500"
        onClick={handleClick}
        title={getMessage("content_excludeSite")}
        type="button"
      >
        <Ban size={14} />
      </button>
      {isConfirming && (
        <div
          aria-labelledby={dialogTitleId}
          aria-modal="true"
          className="absolute inset-0 flex items-stretch justify-between rounded-xl border border-red-200 border-solid bg-white px-3 py-2"
          role="dialog"
        >
          <span
            className="flex items-center text-gray-600 text-xs"
            id={dialogTitleId}
          >
            {getMessage("content_disableOnSite")}
          </span>
          <div className="flex items-stretch gap-2 py-0">
            <button
              className="flex cursor-pointer items-center rounded border-none bg-red-500 px-2 text-white text-xs transition-colors hover:bg-red-600"
              onClick={handleConfirm}
              ref={confirmButtonRef}
              type="button"
            >
              {getMessage("content_disable")}
            </button>
            <button
              aria-label={getMessage("content_cancel")}
              className="flex cursor-pointer items-center rounded border-none bg-transparent p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              onClick={handleCancel}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
