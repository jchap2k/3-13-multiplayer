import { HeartHandshake } from "lucide-react";
import { resolveDonateUrl } from "@shared/donate";
import { cn } from "../lib/utils";
import { buttonVariants } from "./ui/button";

export function DonateLink({
  url,
  compact = false,
  className,
}: {
  url?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const href = resolveDonateUrl(url);
  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("underline-offset-2 hover:underline", className)}
      >
        Support hosting
      </a>
    );
  }
  return (
    <div className={cn("space-y-1.5", className)}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "outline" })}
      >
        <HeartHandshake className="h-4 w-4" />
        Support hosting
      </a>
      <p className="text-xs text-emerald-100/50">
        Opens Stripe Checkout in a new tab. Helps cover Fly hosting.
      </p>
    </div>
  );
}
