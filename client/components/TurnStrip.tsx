import type { PublicPlayer } from "@shared/types";
import { BotPlayBadge } from "./BotPlayControls";
import { SeatAvatar } from "./SeatAvatar";
import { SitName, playerGold } from "./SitName";
import { connectionNote, turnNeighbors } from "../lib/turnRing";
import { cn } from "../lib/utils";

function Chip({
  player,
  label,
  current = false,
}: {
  player: PublicPlayer | null;
  label: string;
  current?: boolean;
}) {
  if (!player) {
    return (
      <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 px-2 py-1.5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100/45">{label}</p>
        <p className="mt-1 text-xs text-emerald-100/40">—</p>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "min-w-0 flex-1 rounded-2xl border px-2 py-1.5",
        current
          ? "your-turn-glow border-amber-300/70 bg-amber-400/15"
          : "border-white/10 bg-black/25",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.14em]",
          current ? "text-amber-100" : "text-emerald-100/50",
        )}
      >
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <SeatAvatar
          avatar={player.avatar}
          seatIndex={player.seatIndex}
          initials={player.name}
          size="sm"
          current={current}
        />
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-semibold", current ? "text-amber-50" : "text-emerald-50")}>
            {player.isYou ? "You" : <SitName name={player.name} goldGlow={playerGold(player)} />}
            {player.isBot ? " · bot" : ""}
            {connectionNote(player)}
            <BotPlayBadge player={player} />
          </p>
          <p className="table-turn-count truncate text-[11px] text-emerald-100/60">{player.cardCount} cards</p>
        </div>
      </div>
    </div>
  );
}

export function TurnStrip({
  players,
  currentId,
}: {
  players: PublicPlayer[];
  currentId: string | null;
}) {
  const ring = turnNeighbors(players, currentId);
  return (
    <div className="table-turn-strip-inner mt-3" data-turn-strip>
      <div className="flex items-stretch gap-1.5 sm:gap-2">
        <Chip player={ring.previous} label="Previous" />
        <Chip player={ring.current} label="Current" current />
        <Chip player={ring.next} label="Next" />
      </div>
    </div>
  );
}
