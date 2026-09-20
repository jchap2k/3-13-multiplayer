import { cardPoints, isWild, type AcePoints } from "./cards.js";
import type { Card } from "./types.js";

export function isValidSet(cards: Card[], wildRank: number): boolean {
  if (cards.length < 3) return false;
  const naturals = cards.filter((card) => !isWild(card, wildRank));
  if (naturals.length === 0) return false;
  const rank = naturals[0].rank;
  return naturals.every((card) => card.rank === rank);
}

function fitsSequence(
  ranks: number[],
  length: number,
  lo: number,
  hi: number,
): boolean {
  const min = Math.min(...ranks);
  const max = Math.max(...ranks);
  if (max - min + 1 > length) return false;
  const startMin = Math.max(lo, max - length + 1);
  const startMax = Math.min(min, hi - length + 1);
  return startMin <= startMax;
}

export function isValidRun(cards: Card[], wildRank: number): boolean {
  if (cards.length < 3) return false;
  const naturals = cards.filter((card) => !isWild(card, wildRank));
  if (naturals.length === 0) return false;
  const suit = naturals[0].suit;
  if (naturals.some((card) => card.suit !== suit)) return false;
  const ranks = naturals.map((card) => card.rank);
  if (new Set(ranks).size !== ranks.length) return false;

  const n = cards.length;
  if (fitsSequence(ranks, n, 1, 13)) return true;

  const aceHigh = ranks.map((rank) => (rank === 1 ? 14 : rank));
  if (new Set(aceHigh).size !== aceHigh.length) return false;
  return fitsSequence(aceHigh, n, 2, 14);
}

export function isValidMeld(cards: Card[], wildRank: number): boolean {
  return isValidSet(cards, wildRank) || isValidRun(cards, wildRank);
}

export interface MeldArrangement {
  melds: Card[][];
  deadwood: Card[];
  deadwoodPoints: number;
}

function popcount(mask: number): number {
  let n = mask;
  let count = 0;
  while (n) {
    n &= n - 1;
    count += 1;
  }
  return count;
}

function cardsFromMask(cards: Card[], mask: number): Card[] {
  return cards.filter((_, index) => (mask & (1 << index)) !== 0);
}

export function bestArrangement(
  cards: Card[],
  wildRank: number,
  acePoints: AcePoints = 15,
  wildFaceValue = false,
): MeldArrangement {
  const n = cards.length;
  if (n === 0) {
    return { melds: [], deadwood: [], deadwoodPoints: 0 };
  }
  if (n > 16) {
    return {
      melds: [],
      deadwood: cards,
      deadwoodPoints: cards.reduce(
        (sum, card) => sum + cardPoints(card, wildRank, acePoints, wildFaceValue),
        0,
      ),
    };
  }

  const meldMask = new Uint8Array(1 << n);
  for (let mask = 0; mask < 1 << n; mask++) {
    if (popcount(mask) < 3) continue;
    if (isValidMeld(cardsFromMask(cards, mask), wildRank)) {
      meldMask[mask] = 1;
    }
  }

  const reachable = new Uint8Array(1 << n);
  const parent = new Int32Array(1 << n).fill(-1);
  reachable[0] = 1;
  const all = (1 << n) - 1;

  for (let covered = 0; covered <= all; covered++) {
    if (!reachable[covered]) continue;
    const leftover = all ^ covered;
    for (let sub = leftover; sub > 0; sub = (sub - 1) & leftover) {
      if (!meldMask[sub]) continue;
      const next = covered | sub;
      if (!reachable[next]) {
        reachable[next] = 1;
        parent[next] = sub;
      }
    }
  }

  let bestMask = 0;
  let bestPoints = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask <= all; mask++) {
    if (!reachable[mask]) continue;
    const dead = cardsFromMask(cards, all ^ mask);
    const points = dead.reduce(
      (sum, card) => sum + cardPoints(card, wildRank, acePoints, wildFaceValue),
      0,
    );
    if (
      points < bestPoints ||
      (points === bestPoints && popcount(mask) > popcount(bestMask))
    ) {
      bestPoints = points;
      bestMask = mask;
    }
  }

  const melds: Card[][] = [];
  let cursor = bestMask;
  while (cursor !== 0) {
    const sub = parent[cursor];
    if (sub <= 0) break;
    melds.push(cardsFromMask(cards, sub));
    cursor ^= sub;
  }

  return {
    melds,
    deadwood: cardsFromMask(cards, all ^ bestMask),
    deadwoodPoints: bestPoints,
  };
}

export function minDeadwood(
  cards: Card[],
  wildRank: number,
  acePoints: AcePoints = 15,
  wildFaceValue = false,
): number {
  return bestArrangement(cards, wildRank, acePoints, wildFaceValue).deadwoodPoints;
}

export function canMeldAll(
  cards: Card[],
  wildRank: number,
  acePoints: AcePoints = 15,
  wildFaceValue = false,
): boolean {
  return cards.length >= 3 && minDeadwood(cards, wildRank, acePoints, wildFaceValue) === 0;
}

export function goOutCardIds(
  hand: Card[],
  wildRank: number,
  acePoints: AcePoints = 15,
  wildFaceValue = false,
): string[] {
  const ids: string[] = [];
  for (const card of hand) {
    const remaining = hand.filter((item) => item.id !== card.id);
    if (canMeldAll(remaining, wildRank, acePoints, wildFaceValue)) ids.push(card.id);
  }
  return ids;
}
