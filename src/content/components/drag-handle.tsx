import { GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMessage } from "@/shared/utils/i18n";

interface DragHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  isDragging: boolean;
}

export function DragHandle({
  onMouseDown,
  onKeyDown,
  isDragging,
}: DragHandleProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Forward keyboard events to parent for accessibility
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onKeyDown?.(e);
    } else if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Escape"
    ) {
      onKeyDown?.(e);
    }
  };

  return (
    <button
      aria-label={getMessage("content_movePopup")}
      aria-pressed={isDragging}
      className="fixed top-0 z-10 flex h-4 w-full cursor-move items-center justify-center border-none bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      onKeyDown={handleKeyDown}
      onMouseDown={onMouseDown}
      type="button"
    >
      <GripHorizontal
        className={cn(
          "transition-[color,opacity] duration-150",
          isDragging ? "text-blue-500 opacity-100" : "text-gray-400 opacity-70"
        )}
        size={16}
      />
    </button>
  );
}
