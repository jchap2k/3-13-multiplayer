import { cardPoints, isWild, type AcePoints } from "./cards.js";
import { bestArrangement, goOutCardIds, minDeadwood } from "./melds.js";
import type { Card } from "./types.js";

export function chooseDraw(
  hand: Card[],
  discardTop: Card | null,
  wildRank: number,
  acePoints: AcePoints = 15,
  wildFaceValue = false,
): "stock" | "discard" {
  if (!discardTop) return "stock";
  const withDiscard = [...hand, discardTop];
  if (goOutCardIds(withDiscard, wildRank, acePoints, wildFaceValue).length > 0) return "discard";
  const current = minDeadwood(hand, wildRank, acePoints, wildFaceValue);
  const next = minDeadwood(withDiscard, wildRank, acePoints, wildFaceValue);
  if (next < current) return "discard";
  if (isWild(discardTop, wildRank)) return "discard";
  return "stock";
}

export function chooseDiscard(
  hand: Card[],
  wildRank: number,
  acePoints: AcePoints = 15,
  wildFaceValue = false,
): { cardId: string; goOut: boolean } {
  if (hand.length === 0) return { cardId: "", goOut: false };
  const naturals = hand.filter((card) => !isWild(card, wildRank));
  // Never throw a wild while a non-wild discard exists (even if dumping the wild would go out).
  const candidates = naturals.length > 0 ? naturals : hand;
  const goOutIds = new Set(goOutCardIds(hand, wildRank, acePoints, wildFaceValue));
  const goOutCands = candidates.filter((card) => goOutIds.has(card.id));
  if (goOutCands.length > 0) {
    let bestId = goOutCands[0].id;
    let bestPts = -1;
    for (const card of goOutCands) {
      const pts = cardPoints(card, wildRank, acePoints, wildFaceValue);
      if (pts > bestPts) {
        bestPts = pts;
        bestId = card.id;
      }
    }
    return { cardId: bestId, goOut: true };
  }

  let bestId = candidates[0].id;
  let bestDead = Number.POSITIVE_INFINITY;
  let bestDump = -1;
  for (const card of candidates) {
    const remaining = hand.filter((item) => item.id !== card.id);
    const dead = minDeadwood(remaining, wildRank, acePoints, wildFaceValue);
    const dump = cardPoints(card, wildRank, acePoints, wildFaceValue);
    if (dead < bestDead || (dead === bestDead && dump > bestDump)) {
      bestDead = dead;
      bestDump = dump;
      bestId = card.id;
    }
  }
  return { cardId: bestId, goOut: false };
}

export function describeHand(
  hand: Card[],
  wildRank: number,
  acePoints: AcePoints = 15,
  wildFaceValue = false,
): string {
  const arranged = bestArrangement(hand, wildRank, acePoints, wildFaceValue);
  return `${arranged.melds.length} meld(s), ${arranged.deadwoodPoints} deadwood`;
}
