import { describe, expect, it } from "vitest";
import {
  buildShoe,
  cardPoints,
  clampWildRank,
  dealCountForRound,
  deckCountForPlayers,
  isLegalWildRank,
  isWild,
  wildAnnouncement,
  wildRankForRound,
  wildSpoken,
} from "../shared/cards";
import { canMeldAll, goOutCardIds, isValidRun, isValidSet, minDeadwood } from "../shared/melds";
import type { Card } from "../shared/types";

function c(id: string, rank: number, suit: Card["suit"]): Card {
  return { id, rank: rank as Card["rank"], suit };
}

describe("ladder and shoe", () => {
  it("deals 3 through 13 and wilds match the deal", () => {
    expect(dealCountForRound(1)).toBe(3);
    expect(wildRankForRound(1)).toBe(3);
    expect(dealCountForRound(11)).toBe(13);
    expect(wildRankForRound(11)).toBe(13);
    expect(wildSpoken(3)).toBe("3s");
    expect(wildSpoken(13)).toBe("Kings");
    expect(wildAnnouncement(1)).toBe("Round 1 — 3s are wild");
    expect(wildAnnouncement(11, true)).toBe("Round 11 — Kings are wild · jokers too");
    expect(isLegalWildRank(1)).toBe(false);
    expect(isLegalWildRank(2)).toBe(false);
    expect(isLegalWildRank(3)).toBe(true);
    expect(isLegalWildRank(13)).toBe(true);
    expect(isLegalWildRank(14)).toBe(false);
    expect(clampWildRank(1)).toBe(3);
    expect(clampWildRank(2)).toBe(3);
    expect(wildSpoken(1)).toBe("3s");
    expect(wildSpoken(2)).toBe("3s");
    expect(wildRankForRound(0)).toBe(3);
  });

  it("never treats 2s or Aces as wild, even if that rank is passed in", () => {
    expect(isWild(c("ace", 1, "H"), 1)).toBe(false);
    expect(isWild(c("ace", 1, "H"), 3)).toBe(false);
    expect(isWild(c("2", 2, "H"), 2)).toBe(false);
    expect(isWild(c("2", 2, "H"), 3)).toBe(false);
    expect(isWild(c("3", 3, "H"), 1)).toBe(false);
    expect(isWild(c("3", 3, "H"), 2)).toBe(false);
    expect(isWild(c("3", 3, "H"), 3)).toBe(true);
    expect(isWild({ id: "j", rank: 0, suit: "J" }, 1)).toBe(true);
    expect(cardPoints(c("2", 2, "H"), 2)).toBe(2);
    expect(cardPoints(c("2", 2, "H"), 2, 15, true)).toBe(2);
    expect(cardPoints(c("ace", 1, "H"), 1)).toBe(15);
    expect(cardPoints(c("ace", 1, "H"), 1, 1)).toBe(1);
    expect(cardPoints(c("ace", 1, "H"), 1, 15, true)).toBe(15);
    expect(cardPoints(c("ace", 1, "H"), 1, 1, true)).toBe(1);
  });

  it("uses the locked deck ladder", () => {
    expect(deckCountForPlayers(2)).toBe(1);
    expect(deckCountForPlayers(3)).toBe(1);
    expect(deckCountForPlayers(4)).toBe(2);
    expect(deckCountForPlayers(5)).toBe(2);
    expect(deckCountForPlayers(6)).toBe(3);
    expect(deckCountForPlayers(8)).toBe(3);
  });

  it("builds N×52, jokers optional", () => {
    expect(buildShoe(1, false)).toHaveLength(52);
    expect(buildShoe(2, false)).toHaveLength(104);
    expect(buildShoe(2, true)).toHaveLength(108);
  });
});

describe("melds", () => {
  it("accepts sets and rejects all-wild sets", () => {
    expect(isValidSet([c("a", 9, "H"), c("b", 9, "S"), c("c", 9, "D")], 3)).toBe(true);
    expect(isValidSet([c("a", 9, "H"), c("b", 3, "S"), c("c", 3, "D")], 3)).toBe(true);
    expect(isValidSet([c("a", 3, "H"), c("b", 3, "S"), c("c", 3, "D")], 3)).toBe(false);
  });

  it("accepts suited runs, ace high or low, no wrap", () => {
    expect(isValidRun([c("a", 4, "H"), c("b", 5, "H"), c("c", 6, "H")], 3)).toBe(true);
    expect(isValidRun([c("a", 4, "H"), c("b", 5, "H"), c("c", 7, "H")], 3)).toBe(false);
    expect(isValidRun([c("a", 1, "H"), c("b", 2, "H"), c("c", 3, "H")], 12)).toBe(true);
    expect(isValidRun([c("a", 12, "H"), c("b", 13, "H"), c("c", 1, "H")], 3)).toBe(true);
    expect(isValidRun([c("a", 13, "H"), c("b", 1, "H"), c("c", 2, "H")], 3)).toBe(false);
    expect(isValidRun([c("a", 4, "H"), c("b", 5, "H"), c("c", 3, "S")], 3)).toBe(true);
    expect(isValidSet([c("a", 1, "H"), c("b", 1, "S"), c("c", 1, "D")], 3)).toBe(true);
  });

  it("finds a go-out discard on a 4-card hand", () => {
    const hand = [c("a", 9, "H"), c("b", 9, "S"), c("c", 9, "D"), c("d", 2, "C")];
    expect(goOutCardIds(hand, 3)).toEqual(["d"]);
    expect(canMeldAll(hand.slice(0, 3), 3)).toBe(true);
  });

  it("scores leftover wilds at 15 and jokers at 20", () => {
    expect(cardPoints(c("a", 3, "H"), 3)).toBe(15);
    expect(cardPoints({ id: "j", rank: 0, suit: "J" }, 3)).toBe(20);
  });

  it("scores caught wilds at face value when the house option is on; jokers score 0", () => {
    expect(cardPoints(c("seven", 7, "H"), 7, 15, true)).toBe(7);
    expect(cardPoints(c("king", 13, "S"), 13, 15, true)).toBe(13);
    expect(cardPoints(c("jack", 11, "D"), 11, 15, true)).toBe(11);
    expect(cardPoints(c("queen", 12, "C"), 12, 15, true)).toBe(12);
    expect(cardPoints(c("ten", 10, "H"), 10, 15, true)).toBe(10);
    expect(cardPoints({ id: "j", rank: 0, suit: "J" }, 3, 15, true)).toBe(0);
    expect(cardPoints(c("nine", 9, "H"), 3, 15, true)).toBe(9);
    expect(minDeadwood([c("a", 7, "H"), { id: "j", rank: 0, suit: "J" }], 7, 15, true)).toBe(7);
  });

  it("scores deadwood aces at 15 by default, or 1 when the house says so", () => {
    expect(cardPoints(c("ace", 1, "H"), 3)).toBe(15);
    expect(cardPoints(c("ace", 1, "H"), 3, 15)).toBe(15);
    expect(cardPoints(c("ace", 1, "H"), 3, 1)).toBe(1);
    expect(cardPoints(c("ace", 1, "H"), 1, 1)).toBe(1);
    expect(minDeadwood([c("a", 1, "H"), c("b", 7, "S")], 3)).toBe(22);
    expect(minDeadwood([c("a", 1, "H"), c("b", 7, "S")], 3, 1)).toBe(8);
  });
});
