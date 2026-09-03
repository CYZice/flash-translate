import { cn } from "@/lib/utils";
import { getMessage } from "@/shared/utils/i18n";

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  side: "left" | "right" | "bottom" | "bottom-left" | "bottom-right";
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
    let validKeys = ["ArrowLeft", "ArrowRight", "Escape"];
    if (side === "bottom") {
      validKeys = ["ArrowUp", "ArrowDown", "Escape"];
    } else if (side === "bottom-left" || side === "bottom-right") {
      validKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape"];
    }
    if (validKeys.includes(e.key)) {
      e.preventDefault();
      onKeyDown?.(e);
    }
  };

  const ariaLabelMap = {
    left: getMessage("content_resizeHandleLeft"),
    right: getMessage("content_resizeHandleRight"),
    bottom: getMessage("content_resizeHandleBottom"),
    "bottom-left": `${getMessage("content_resizeHandleLeft")}, ${getMessage("content_resizeHandleBottom")}`,
    "bottom-right": `${getMessage("content_resizeHandleRight")}, ${getMessage("content_resizeHandleBottom")}`,
  } as const;

  const ariaLabel = ariaLabelMap[side];
  let ariaOrientation: "horizontal" | "vertical" | undefined;
  if (side === "bottom") {
    ariaOrientation = "vertical";
  } else if (side === "left" || side === "right") {
    ariaOrientation = "horizontal";
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: <hr> is not appropriate for resize handle
    <div
      aria-label={ariaLabel}
      aria-orientation={ariaOrientation}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(sizePercent)}
      className={cn(
        "absolute z-20 bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        side === "left" && "top-0 bottom-0 left-0 w-2 cursor-ew-resize",
        side === "right" && "top-0 right-0 bottom-0 w-2 cursor-ew-resize",
        side === "bottom" && "right-0 bottom-0 left-0 h-2 cursor-ns-resize",
        side === "bottom-left" &&
          "bottom-0 left-0 z-30 h-3 w-3 cursor-nesw-resize",
        side === "bottom-right" &&
          "right-0 bottom-0 z-30 h-3 w-3 cursor-nwse-resize"
      )}
      onKeyDown={handleKeyDown}
      onMouseDown={onMouseDown}
      role="separator"
      tabIndex={0}
    />
  );
}
