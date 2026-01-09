import { cn } from "@/lib/utils";
import { getMessage } from "@/shared/utils/i18n";

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  side: "left" | "right" | "bottom";
  /** Current size percentage (0-100) for aria-valuenow */
  sizePercent?: number;
}

export function ResizeHandle({
  onMouseDown,
  onKeyDown,
  side,
  sizePercent = 50,
}: ResizeHandleProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Forward arrow keys and Escape to parent for keyboard resizing
    const validKeys =
      side === "bottom"
        ? ["ArrowUp", "ArrowDown", "Escape"]
        : ["ArrowLeft", "ArrowRight", "Escape"];
    if (validKeys.includes(e.key)) {
      e.preventDefault();
      onKeyDown?.(e);
    }
  };

  const getAriaLabel = () => {
    if (side === "left") {
      return getMessage("content_resizeHandleLeft");
    }
    if (side === "right") {
      return getMessage("content_resizeHandleRight");
    }
    return getMessage("content_resizeHandleBottom");
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: <hr> is not appropriate for resize handle
    <div
      aria-label={getAriaLabel()}
      aria-orientation={side === "bottom" ? "vertical" : "horizontal"}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(sizePercent)}
      className={cn(
        "fixed z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        side === "left" && "left-0 h-full w-2 cursor-ew-resize",
        side === "right" && "right-0 h-full w-2 cursor-ew-resize",
        side === "bottom" && "bottom-0 h-2 w-full cursor-ns-resize"
      )}
      onKeyDown={handleKeyDown}
      onMouseDown={onMouseDown}
      role="separator"
      tabIndex={0}
    />
  );
}
