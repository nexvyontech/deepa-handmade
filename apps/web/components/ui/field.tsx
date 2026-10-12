import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const baseFieldClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:bg-stone-100 disabled:text-stone-500";

export function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-stone-700">
      {children}
    </label>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className = "", invalid = false, ...rest }: InputProps) {
  return (
    <input
      className={`${baseFieldClass} ${invalid ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""} ${className}`}
      {...rest}
    />
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ className = "", invalid = false, children, ...rest }: SelectProps) {
  return (
    <select
      className={`${baseFieldClass} pr-8 ${invalid ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ className = "", invalid = false, ...rest }: TextareaProps) {
  return (
    <textarea
      className={`${baseFieldClass} min-h-24 ${invalid ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""} ${className}`}
      {...rest}
    />
  );
}

export function Checkbox({
  className = "",
  label,
  ...rest
}: { label?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-800">
      <input
        type="checkbox"
        className={`h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600 ${className}`}
        {...rest}
      />
      {label}
    </label>
  );
}

/** Field wrapper with label + error/hint text. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  error?: string | null;
  hint?: string | null;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {label ? (
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="ml-0.5 text-amber-700">*</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}