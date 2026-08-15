import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "ghost" | "danger" | "muted" | "destructive";
type TooltipAlign = "start" | "center" | "end";
type TooltipSide = "top" | "bottom";

interface ButtonProps extends ComponentProps<"button"> {
  tooltip?: string;
  tooltipAlign?: TooltipAlign;
  tooltipSide?: TooltipSide;
  variant?: ButtonVariant;
}

const baseStyles =
  "flex min-h-8 min-w-8 cursor-pointer items-center justify-center rounded border-none p-1 text-center backdrop-blur-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30";

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-white/70 text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:hover:bg-white/70",
  ghost:
    "bg-transparent text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:hover:bg-transparent",
  danger:
    "bg-white/70 text-gray-400 hover:bg-red-200 hover:text-red-500 disabled:hover:bg-white/70",
  muted:
    "bg-white/70 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:hover:bg-white/70",
  destructive:
    "bg-red-500 text-white hover:bg-red-600 disabled:hover:bg-red-500",
};

const tooltipSideStyles: Record<TooltipSide, string> = {
  top: "bottom-full mb-1.5",
  bottom: "top-full mt-1.5",
};

const tooltipAlignStyles: Record<TooltipAlign, string> = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
};

export function Button({
  variant = "default",
  tooltip,
  tooltipAlign = "center",
  tooltipSide = "bottom",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const button = (
    <button
      className={cn(baseStyles, variantStyles[variant], className)}
      type={type}
      {...props}
    >
      {children}
    </button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <span className="group relative inline-flex shrink-0">
      {button}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 font-medium text-white text-xs opacity-0 shadow-sm transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100",
          tooltipAlignStyles[tooltipAlign],
          tooltipSideStyles[tooltipSide]
        )}
      >
        {tooltip}
      </span>
    </span>
  );
}
