import type { PublicPlayer } from "@shared/types";
import { cn } from "../lib/utils";

export function SitName({
  name,
  goldGlow = false,
  className,
  onOpen,
}: {
  name: string;
  goldGlow?: boolean;
  className?: string;
  onOpen?: () => void;
}) {
  const glow = goldGlow ? "sit-name-gold" : "";
  if (onOpen) {
    return (
      <button
        type="button"
        className={cn("sit-name-btn", glow, className)}
        onClick={onOpen}
        title={`Open stats for ${name}`}
      >
        {name}
      </button>
    );
  }
  return <span className={cn(glow, className)}>{name}</span>;
}

export function playerGold(player: { goldGlow?: boolean; isBot?: boolean }): boolean {
  return Boolean(player.goldGlow) && !player.isBot;
}
