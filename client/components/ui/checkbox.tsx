import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Checkbox({
  className,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-start gap-2 text-sm leading-snug">
      <input
        type="checkbox"
        className={cn("mt-1 h-4 w-4 accent-felt", className)}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
