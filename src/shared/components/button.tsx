import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "ghost" | "danger" | "muted" | "destructive";

interface ButtonProps extends ComponentProps<"button"> {
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

export function Button({
  variant = "default",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(baseStyles, variantStyles[variant], className)}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
