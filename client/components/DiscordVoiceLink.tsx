import { Headphones } from "lucide-react";
import { resolveDiscordVoiceUrl } from "@shared/discord";
import { cn } from "../lib/utils";
import { buttonVariants } from "./ui/button";

export function DiscordVoiceLink({
  url,
  compact = false,
  className,
}: {
  url?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const href = resolveDiscordVoiceUrl(url);
  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("underline-offset-2 hover:underline", className)}
      >
        Voice (Discord)
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
        <Headphones className="h-4 w-4" />
        Join Discord voice
      </a>
      <p className="text-xs text-emerald-100/50">Voice chat lives on Discord for now.</p>
    </div>
  );
}
