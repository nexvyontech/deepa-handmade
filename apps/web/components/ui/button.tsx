import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Spinner } from "./spinner";

const variants = {
  primary: "bg-amber-700 text-white hover:bg-amber-800",
  secondary: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-100",
  ghost: "text-stone-700 hover:bg-stone-100",
  danger: "bg-red-700 text-white hover:bg-red-800",
} as const;

const sizes = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, className = "", disabled, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? <Spinner size="sm" /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

/** Tailwind classes for rendering a Link as a button (Next Link builds its own element). */
export function buttonClassNames(
  variant: keyof typeof variants = "primary",
  size: keyof typeof sizes = "md",
  extra = "",
): string {
  return `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600 ${variants[variant]} ${sizes[size]} ${extra}`;
}