import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full min-h-12 rounded-[var(--radius-field)] border border-line-strong bg-surface px-4 text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(base, className)} {...p} />
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => <textarea ref={ref} className={cn(base, "py-3 leading-relaxed min-h-28", className)} {...p} />
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...p }, ref) => (
    <select ref={ref} className={cn(base, "appearance-auto pr-3", className)} {...p}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

/** Etiqueta con texto + ayuda + error. Los errores se leen con lectores de pantalla. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className="font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[length:var(--text-body-sm)] text-ink-3">{hint}</p>}
      <p role="alert" aria-live="polite" className="text-[length:var(--text-body-sm)] text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}
