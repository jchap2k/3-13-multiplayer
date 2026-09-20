import { dealCountForRound, rankLabel, ROUND_COUNT } from "./cards.js";
import type { PublicPlayer, RevealedHand } from "./types.js";

/** Pause on the scoreboard before the next deal so totals can be read. */
export const AUTO_NEXT_MS = 12_000;

export interface Standing {
  id: string;
  name: string;
  isBot: boolean;
  isYou: boolean;
  score: number;
  roundScores: number[];
  place: number;
  goldGlow: boolean;
}

export function rankStandings(
  players: Pick<PublicPlayer, "id" | "name" | "isBot" | "isYou" | "score" | "roundScores" | "goldGlow">[],
): Standing[] {
  const sorted = [...players].sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
  let place = 0;
  let lastScore = Number.NaN;
  return sorted.map((player, index) => {
    if (player.score !== lastScore) {
      place = index + 1;
      lastScore = player.score;
    }
    return {
      id: player.id,
      name: player.name,
      isBot: player.isBot,
      isYou: player.isYou,
      score: player.score,
      roundScores: player.roundScores,
      place,
      goldGlow: Boolean(player.goldGlow) && !player.isBot,
    };
  });
}

export function placeLabel(place: number): string {
  const tens = place % 100;
  const ones = place % 10;
  if (ones === 1 && tens !== 11) return `${place}st`;
  if (ones === 2 && tens !== 12) return `${place}nd`;
  if (ones === 3 && tens !== 13) return `${place}rd`;
  return `${place}th`;
}

export function scoreRoundLabel(round: number): string {
  return rankLabel(dealCountForRound(round));
}

export function scoredRoundCount(players: { roundScores: number[] }[], currentRound: number): number {
  const posted = Math.max(0, ...players.map((player) => player.roundScores.length));
  return Math.min(ROUND_COUNT, Math.max(posted, currentRound));
}

export function secondsUntil(at: number | null, now = Date.now()): number | null {
  if (at == null) return null;
  return Math.max(0, Math.ceil((at - now) / 1000));
}

export function lastRoundPoints(player: { roundScores: number[] }): number | null {
  if (player.roundScores.length === 0) return null;
  return player.roundScores[player.roundScores.length - 1] ?? null;
}

export function revealedFor(
  revealed: RevealedHand[] | undefined,
  playerId: string,
): RevealedHand | undefined {
  return revealed?.find((row) => row.playerId === playerId);
}
