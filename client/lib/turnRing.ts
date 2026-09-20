import type { PublicPlayer } from "@shared/types";

export function connectionNote(player: Pick<PublicPlayer, "isBot" | "connected" | "botPlay">): string {
  if (player.isBot || player.botPlay) return "";
  if (player.connected) return "";
  return " · away";
}

export function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function turnNeighbors(
  players: PublicPlayer[],
  currentId: string | null,
): {
  previous: PublicPlayer | null;
  current: PublicPlayer | null;
  next: PublicPlayer | null;
} {
  if (players.length === 0 || !currentId) {
    return { previous: null, current: null, next: null };
  }
  const index = players.findIndex((player) => player.id === currentId);
  if (index < 0) return { previous: null, current: null, next: null };
  const n = players.length;
  return {
    previous: players[(index - 1 + n) % n] ?? null,
    current: players[index] ?? null,
    next: players[(index + 1) % n] ?? null,
  };
}
