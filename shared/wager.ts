import { ROUND_COUNT } from "./cards.js";

export const INITIAL_STAKE = 5;
export const STAKE_PRESETS = [1, 5, 10, 20] as const;
export const MIN_STAKE = 1;
export const MAX_STAKE = 500;

export function clampStake(raw: number): number {
  if (!Number.isFinite(raw)) return INITIAL_STAKE;
  return Math.min(MAX_STAKE, Math.max(MIN_STAKE, Math.round(raw)));
}

export interface WagerOwe {
  playerId: string;
  name: string;
  score: number;
  multiplier: number;
  amount: number;
  starVictim: boolean;
}

export interface WagerSettlement {
  winnerId: string;
  winnerName: string;
  winnerScore: number;
  stake: number;
  stakePath: number[];
  doubled: boolean;
  perfectSweep: boolean;
  sweeperName: string | null;
  suddenDeathHands: number;
  owes: WagerOwe[];
  winnerCollected: number;
}

export function shouldDoubleStake(scores: number[]): boolean {
  return scores.length > 0 && scores.every((score) => score === scores[0]);
}

export function nextStake(current: number): number {
  return current * 2;
}

export function isPerfectSweep(
  firstOutIds: (string | null | undefined)[],
  regulationHands = ROUND_COUNT,
): { sweep: boolean; sweeperId: string | null } {
  if (firstOutIds.length < regulationHands) return { sweep: false, sweeperId: null };
  const regulation = firstOutIds.slice(0, regulationHands);
  const first = regulation[0];
  if (!first || !regulation.every((id) => id === first)) {
    return { sweep: false, sweeperId: null };
  }
  return { sweep: true, sweeperId: first };
}

/** Largest single multiplier. Never stacked. Winner at 100+ pays only the stake. */
export function payoutMultiplier(winnerScore: number, loserScore: number, starVictim: boolean): number {
  if (winnerScore >= 100) return 1;
  let multiplier = 1;
  if (loserScore > 100) multiplier = 2;
  if (loserScore > 200) multiplier = 4;
  if (starVictim) multiplier = Math.max(multiplier, 8);
  return multiplier;
}

export function formatPlayMoney(amount: number): string {
  return `$${amount}`;
}

export function formatStakePath(path: number[]): string | null {
  if (path.length < 2) return null;
  return `Started at ${formatPlayMoney(path[0])}, doubled to ${formatPlayMoney(path[path.length - 1])}.`;
}

export function wagerOweLine(owe: WagerOwe, winnerName: string): string {
  const why =
    owe.multiplier <= 1
      ? null
      : owe.starVictim
        ? "8x — perfect sweep"
        : owe.multiplier === 4
          ? "4x — over 200"
          : owe.multiplier === 2
            ? "2x — over 100"
            : `${owe.multiplier}x`;
  const extra = why ? ` (${why})` : "";
  return `${owe.name} owes ${winnerName} ${formatPlayMoney(owe.amount)}${extra}.`;
}

export function settleWager(input: {
  players: { id: string; name: string; score: number }[];
  winnerId: string;
  stake: number;
  stakePath: number[];
  firstOutIds: (string | null | undefined)[];
  suddenDeathHands: number;
}): WagerSettlement | null {
  const winner = input.players.find((player) => player.id === input.winnerId);
  if (!winner) return null;
  const { sweep, sweeperId } = isPerfectSweep(input.firstOutIds);
  const owes = input.players
    .filter((player) => player.id !== winner.id)
    .map((player) => {
      const starVictim = sweep && player.id !== sweeperId;
      const multiplier = payoutMultiplier(winner.score, player.score, starVictim);
      return {
        playerId: player.id,
        name: player.name,
        score: player.score,
        multiplier,
        amount: input.stake * multiplier,
        starVictim,
      };
    });
  return {
    winnerId: winner.id,
    winnerName: winner.name,
    winnerScore: winner.score,
    stake: input.stake,
    stakePath: [...input.stakePath],
    doubled: input.stakePath.length > 1,
    perfectSweep: sweep,
    sweeperName: sweep ? (input.players.find((player) => player.id === sweeperId)?.name ?? null) : null,
    suddenDeathHands: input.suddenDeathHands,
    owes,
    winnerCollected: owes.reduce((sum, row) => sum + row.amount, 0),
  };
}