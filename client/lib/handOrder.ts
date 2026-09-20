import { isJoker, isWild, type AcePoints } from "@shared/cards";
import { bestArrangement, isValidSet } from "@shared/melds";
import type { Card } from "@shared/types";

const SUIT_ORDER: Record<string, number> = { S: 0, H: 1, D: 2, C: 3, J: 4 };

export function mergeHandOrder(prev: string[], hand: Card[]): string[] {
  const have = new Set(hand.map((card) => card.id));
  const kept = prev.filter((id) => have.has(id));
  const keptSet = new Set(kept);
  const added = hand.filter((card) => !keptSet.has(card.id)).map((card) => card.id);
  return [...kept, ...added];
}

export function orderedHand(hand: Card[], order: string[]): Card[] {
  const byId = new Map(hand.map((card) => [card.id, card]));
  const cards: Card[] = [];
  for (const id of order) {
    const card = byId.get(id);
    if (card) cards.push(card);
  }
  if (cards.length !== hand.length) {
    for (const card of hand) {
      if (!order.includes(card.id)) cards.push(card);
    }
  }
  return cards;
}

export function arrayMove<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function sortByRank(hand: Card[]): string[] {
  return [...hand]
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return (SUIT_ORDER[a.suit] ?? 9) - (SUIT_ORDER[b.suit] ?? 9);
    })
    .map((card) => card.id);
}

export function sortBySuit(hand: Card[]): string[] {
  return [...hand]
    .sort((a, b) => {
      const suit = (SUIT_ORDER[a.suit] ?? 9) - (SUIT_ORDER[b.suit] ?? 9);
      if (suit !== 0) return suit;
      return a.rank - b.rank;
    })
    .map((card) => card.id);
}

function suitRank(card: Card): number {
  return SUIT_ORDER[card.suit] ?? 9;
}

function bySuitThenRank(a: Card, b: Card): number {
  const suit = suitRank(a) - suitRank(b);
  if (suit !== 0) return suit;
  return a.rank - b.rank;
}

function spansSequence(ranks: number[], length: number, lo: number, hi: number): boolean {
  const min = Math.min(...ranks);
  const max = Math.max(...ranks);
  if (max - min + 1 > length) return false;
  return Math.max(lo, max - length + 1) <= Math.min(min, hi - length + 1);
}

function sequenceKey(rank: number, aceHigh: boolean): number {
  return aceHigh && rank === 1 ? 14 : rank;
}

function orderRun(cards: Card[], wildRank: number): Card[] {
  const naturals = cards.filter((card) => !isWild(card, wildRank));
  const wilds = cards.filter((card) => isWild(card, wildRank));
  if (naturals.length === 0) return [...cards];
  const aceHigh = !spansSequence(
    naturals.map((card) => card.rank),
    cards.length,
    1,
    13,
  );
  const keys = naturals.map((card) => sequenceKey(card.rank, aceHigh));
  const max = Math.max(...keys);
  const n = cards.length;
  const lo = aceHigh ? 2 : 1;
  const start = Math.max(lo, max - n + 1);
  const byKey = new Map(naturals.map((card) => [sequenceKey(card.rank, aceHigh), card]));
  const wildQueue = wilds.slice();
  const ordered: Card[] = [];
  for (let rank = start; rank < start + n; rank++) {
    const natural = byKey.get(rank);
    if (natural) ordered.push(natural);
    else {
      const wild = wildQueue.shift();
      if (wild) ordered.push(wild);
    }
  }
  return [...ordered, ...wildQueue];
}

function orderMeld(cards: Card[], wildRank: number): Card[] {
  if (isValidSet(cards, wildRank)) return [...cards].sort(bySuitThenRank);
  return orderRun(cards, wildRank);
}

function clusterKey(cards: Card[], wildRank: number): number {
  const naturals = cards.filter((card) => !isWild(card, wildRank));
  if (naturals.length === 0) return 99;
  return Math.min(...naturals.map((card) => (card.rank === 1 ? 14 : card.rank)));
}

function almostNeighbors(a: Card, b: Card): boolean {
  if (a.suit !== b.suit || a.suit === "J") return false;
  const gap = Math.abs(a.rank - b.rank);
  if (gap === 1) return true;
  const ranks = new Set([a.rank, b.rank]);
  return ranks.has(1) && (ranks.has(2) || ranks.has(13));
}

function orderDeadwood(cards: Card[], wildRank: number): Card[] {
  const wilds = cards.filter((card) => isWild(card, wildRank)).sort(bySuitThenRank);
  const naturals = cards.filter((card) => !isWild(card, wildRank));
  const byRank = new Map<number, Card[]>();
  for (const card of naturals) {
    const group = byRank.get(card.rank) ?? [];
    group.push(card);
    byRank.set(card.rank, group);
  }
  const pairs: Card[] = [];
  const singles: Card[] = [];
  for (const rank of [...byRank.keys()].sort((a, b) => a - b)) {
    const group = (byRank.get(rank) ?? []).sort(bySuitThenRank);
    if (group.length >= 2) pairs.push(...group);
    else singles.push(...group);
  }
  const leftovers: Card[] = [];
  const used = new Set<string>();
  const sortedSingles = singles.slice().sort(bySuitThenRank);
  for (let i = 0; i < sortedSingles.length; i++) {
    const card = sortedSingles[i];
    if (used.has(card.id)) continue;
    const mate = sortedSingles.find(
      (other, index) => index > i && !used.has(other.id) && almostNeighbors(card, other),
    );
    leftovers.push(card);
    used.add(card.id);
    if (mate) {
      leftovers.push(mate);
      used.add(mate.id);
    }
  }
  return [...pairs, ...leftovers, ...wilds];
}

/** Group legal runs and 3+ sets, then leftover pairs / near-runs. Drag still works after. */
export function sortByMelds(
  hand: Card[],
  wildRank: number,
  acePoints: AcePoints = 15,
  wildFaceValue = false,
): string[] {
  const { melds, deadwood } = bestArrangement(hand, wildRank, acePoints, wildFaceValue);
  const clusters = melds
    .map((meld) => orderMeld(meld, wildRank))
    .sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      return clusterKey(a, wildRank) - clusterKey(b, wildRank);
    });
  return [...clusters.flat(), ...orderDeadwood(deadwood, wildRank)].map((card) => card.id);
}

export function groupWilds(hand: Card[], wildRank: number): string[] {
  const wilds: string[] = [];
  const rest: string[] = [];
  for (const card of hand) {
    if (isWild(card, wildRank) || isJoker(card)) wilds.push(card.id);
    else rest.push(card.id);
  }
  return [...wilds, ...rest];
}

export function handOrderKey(playerId: string, roomCode: string, round: number): string {
  return `tt-hand-order:${playerId}:${roomCode}:${round}`;
}

export function loadHandOrder(key: string): string[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function saveHandOrder(key: string, order: string[]) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(order));
  } catch {
    // ignore quota / private mode
  }
}
