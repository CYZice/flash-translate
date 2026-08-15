import { Check, Copy, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/button";
import { getMessage } from "@/shared/utils/i18n";
import { createPrefixedLogger } from "@/shared/utils/logger";

const log = createPrefixedLogger("CopyButton");

interface CopyButtonProps {
  text: string | null;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = async () => {
    if (!text) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      log.error("Failed to copy:", err);
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  return (
    <Button
      aria-label={
        state === "error"
          ? getMessage("content_copyFailed")
          : getMessage("content_copyTranslation")
      }
      className={cn(
        state === "copied" && "text-green-600 hover:text-green-600",
        state === "error" && "text-red-500 hover:text-red-500"
      )}
      disabled={!text}
      onClick={handleCopy}
      tooltip={
        state === "error"
          ? getMessage("content_copyFailed")
          : getMessage("content_copyTranslation")
      }
      tooltipAlign="end"
      tooltipSide="top"
      variant="ghost"
    >
      {state === "idle" && <Copy size={14} />}
      {state === "copied" && <Check size={14} />}
      {state === "error" && <X size={14} />}
    </Button>
  );
}
