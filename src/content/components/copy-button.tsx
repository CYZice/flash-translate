import { Check, Copy, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
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
    <button
      aria-label={
        state === "error"
          ? getMessage("content_copyFailed")
          : getMessage("content_copyTranslation")
      }
      className={cn(
        "flex min-h-8 min-w-8 cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-center backdrop-blur-sm transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
        state === "idle" && "text-gray-400 hover:text-blue-600",
        state === "copied" && "text-green-600",
        state === "error" && "text-red-500"
      )}
      disabled={!text}
      onClick={handleCopy}
      type="button"
    >
      {state === "idle" && <Copy size={14} />}
      {state === "copied" && <Check size={14} />}
      {state === "error" && <X size={14} />}
    </button>
  );
}
