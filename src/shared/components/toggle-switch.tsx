import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  id?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel?: string;
}

export function ToggleSwitch({
  id,
  checked,
  disabled = false,
  onChange,
  ariaLabel,
}: ToggleSwitchProps) {
  return (
    <button
      aria-checked={checked}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        checked ? "bg-blue-500" : "bg-gray-200"
      )}
      disabled={disabled}
      id={id}
      onClick={onChange}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}
