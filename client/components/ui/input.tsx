import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-white/15 bg-black/30 px-3 text-sm text-white placeholder:text-white/40 outline-none ring-amber-300/30 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
