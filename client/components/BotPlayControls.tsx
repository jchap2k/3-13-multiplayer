import { botPlayBadge } from "@shared/botPlay";
import type { PublicPlayer } from "@shared/types";

export function BotPlayBadge({ player }: { player: PublicPlayer }) {
  const label = botPlayBadge(player);
  if (!label) return null;
  return <span className="bot-play-badge">{label}</span>;
}

export function AutoPlayCheck({
  player,
  onToggle,
}: {
  player: PublicPlayer;
  onToggle: (playerId: string, on: boolean) => void;
}) {
  if (player.isBot) return null;
  return (
    <label className="auto-play-check">
      <input
        type="checkbox"
        checked={player.botPlay}
        onChange={(event) => onToggle(player.id, event.target.checked)}
      />
      <span>Auto-play</span>
    </label>
  );
}

export function HostStandInBar({
  players,
  onToggle,
}: {
  players: PublicPlayer[];
  onToggle: (playerId: string, on: boolean) => void;
}) {
  const others = players.filter((player) => !player.isBot && !player.isYou);
  if (others.length === 0) return null;
  return (
    <div className="host-stand-in mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-200/20 bg-black/20 px-2 py-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100/70">
        Other seats
      </p>
      {others.map((player) => (
        <span key={player.id} className="inline-flex items-center gap-1 text-xs text-emerald-50">
          <span className="max-w-[8rem] truncate font-semibold">{player.name}</span>
          <AutoPlayCheck player={player} onToggle={onToggle} />
        </span>
      ))}
    </div>
  );
}