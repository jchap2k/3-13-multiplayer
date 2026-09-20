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
  const humans = players.filter((player) => !player.isBot);
  if (humans.length === 0) return null;
  return (
    <div className="host-stand-in mt-3 rounded-2xl border border-amber-200/25 bg-black/25 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100/80">
        Host · Auto-play
      </p>
      <p className="mt-1 text-[11px] text-emerald-100/60">
        Checked = the bot takes that seat’s turns. Unchecks when they rejoin.
      </p>
      <ul className="mt-2 space-y-1.5">
        {humans.map((player) => (
          <li key={player.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-semibold text-emerald-50">
              {player.isYou ? `${player.name} · you` : player.name}
              <BotPlayBadge player={player} />
            </span>
            <AutoPlayCheck player={player} onToggle={onToggle} />
          </li>
        ))}
      </ul>
    </div>
  );
}