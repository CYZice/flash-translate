import { Pencil, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ExclusionPattern } from "@/shared/storage/settings";
import { getMessage } from "@/shared/utils/i18n";

interface ExclusionPatternItemProps {
  pattern: ExclusionPattern;
  onPatternChange: (updated: ExclusionPattern) => void;
  onDelete: () => void;
}

export function ExclusionPatternItem({
  pattern,
  onPatternChange,
  onDelete,
}: ExclusionPatternItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
    onPatternChange({ ...pattern, enabled: !pattern.enabled });
  };

  const handleSaveEdit = () => {
    const newPatternValue = editInputRef.current?.value.trim();
    if (!newPatternValue) {
      return;
    }

    onPatternChange({ ...pattern, pattern: newPatternValue });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const formatUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
    } catch {
      return url;
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          defaultValue={pattern.pattern}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSaveEdit();
            }
            if (e.key === "Escape") {
              handleCancelEdit();
            }
          }}
          ref={editInputRef}
          type="text"
        />
        <button
          className="px-1.5 text-blue-600 text-xs hover:text-blue-800"
          onClick={handleSaveEdit}
          type="button"
        >
          {getMessage("popup_exclusion_ok")}
        </button>
        <button
          className="px-1.5 text-gray-500 text-xs hover:text-gray-700"
          onClick={handleCancelEdit}
          type="button"
        >
          x
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-9 items-center gap-2 px-1 py-2",
        !pattern.enabled && "opacity-60"
      )}
    >
      <input
        checked={pattern.enabled}
        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        onChange={handleToggle}
        type="checkbox"
      />
      <span
        className={cn(
          "flex-1 truncate text-xs",
          pattern.enabled ? "text-gray-700" : "text-gray-400"
        )}
        title={pattern.pattern}
      >
        {formatUrl(pattern.pattern)}
      </span>
      <button
        className="p-0.5 text-gray-400 hover:text-blue-600"
        onClick={() => setIsEditing(true)}
        title={getMessage("action_edit")}
        type="button"
      >
        <Pencil size={12} />
      </button>
      <button
        className="p-0.5 text-gray-400 hover:text-red-600"
        onClick={onDelete}
        title={getMessage("action_delete")}
        type="button"
      >
        <X size={12} />
      </button>
    </div>
  );
}
