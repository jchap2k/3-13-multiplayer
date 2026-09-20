import type { Card, Rank, Suit } from "./types.js";

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const SUIT_GLYPH: Record<Suit | "J", string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
  J: "★",
};

export const RANK_LABEL: Record<number, string> = {
  0: "★",
  1: "A",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
};

export const ROUND_COUNT = 11;

export function dealCountForRound(round: number): number {
  return round + 2;
}

/** Wilds are only 3 through King. 2s and Aces are never the wild rank. */
export function isLegalWildRank(rank: number): boolean {
  return Number.isInteger(rank) && rank >= 3 && rank <= 13;
}

export function wildRankForRound(round: number): number {
  const rank = dealCountForRound(round);
  return isLegalWildRank(rank) ? rank : 3;
}

export function deckCountForPlayers(playerCount: number): number {
  if (playerCount <= 3) return 1;
  if (playerCount <= 5) return 2;
  return 3;
}

export function isRed(card: Card): boolean {
  return card.suit === "H" || card.suit === "D";
}

export function isJoker(card: Card): boolean {
  return card.suit === "J";
}

export function isWild(card: Card, wildRank: number): boolean {
  if (isJoker(card)) return true;
  if (card.rank === 1 || card.rank === 2) return false;
  return isLegalWildRank(wildRank) && card.rank === wildRank;
}

export function rankLabel(rank: number): string {
  return RANK_LABEL[rank] ?? String(rank);
}

export function clampWildRank(rank: number): number {
  return isLegalWildRank(rank) ? rank : 3;
}

export function wildLabel(wildRank: number): string {
  return `${rankLabel(clampWildRank(wildRank))}s`;
}

export function wildSpoken(wildRank: number): string {
  const rank = clampWildRank(wildRank);
  if (rank === 11) return "Jacks";
  if (rank === 12) return "Queens";
  if (rank === 13) return "Kings";
  return `${rankLabel(rank)}s`;
}

export function wildAnnouncement(round: number, jokers = false): string {
  const line = `Round ${round} — ${wildSpoken(wildRankForRound(round))} are wild`;
  return jokers ? `${line} · jokers too` : line;
}

export type AcePoints = 1 | 15;

export function faceValue(card: Card, acePoints: AcePoints = 15): number {
  if (isJoker(card)) return 0;
  if (card.rank === 1) return acePoints;
  return card.rank;
}

export function cardPoints(
  card: Card,
  wildRank: number,
  acePoints: AcePoints = 15,
  wildFaceValue = false,
): number {
  if (isJoker(card)) return wildFaceValue ? 0 : 20;
  if (isWild(card, wildRank)) {
    return wildFaceValue ? faceValue(card, acePoints) : 15;
  }
  if (card.rank === 1) return acePoints;
  if (card.rank >= 11) return 10;
  return card.rank;
}

export function handPoints(
  cards: Card[],
  wildRank: number,
  acePoints: AcePoints = 15,
  wildFaceValue = false,
): number {
  return cards.reduce(
    (sum, card) => sum + cardPoints(card, wildRank, acePoints, wildFaceValue),
    0,
  );
}

export function buildShoe(decks: number, jokers: boolean): Card[] {
  const cards: Card[] = [];
  for (let deck = 0; deck < decks; deck++) {
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        cards.push({
          id: `${deck}-${rank}${suit}`,
          suit,
          rank: rank as Rank,
        });
      }
    }
    if (jokers) {
      cards.push({ id: `${deck}-JA`, suit: "J", rank: 0 });
      cards.push({ id: `${deck}-JB`, suit: "J", rank: 0 });
    }
  }
  return cards;
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function formatCard(card: Card): string {
  if (isJoker(card)) return "Joker";
  return `${rankLabel(card.rank)}${SUIT_GLYPH[card.suit]}`;
}

export const ROUNDS_TABLE = Array.from({ length: ROUND_COUNT }, (_, i) => {
  const round = i + 1;
  const deal = dealCountForRound(round);
  return { round, deal, wild: wildLabel(deal), wildRank: deal };
});
