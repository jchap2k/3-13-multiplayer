import { describe, expect, it } from "vitest";
import { coachAdvice } from "../shared/coach";
import type { Card } from "../shared/types";

function c(id: string, rank: number, suit: Card["suit"]): Card {
  return { id, rank: rank as Card["rank"], suit };
}

const base = {
  phase: "playing" as const,
  round: 1,
  dealCount: 3,
  wildRank: 3,
  yourTurn: true,
  turnPhase: "draw" as const,
  yourHand: [c("a", 7, "H"), c("b", 9, "S"), c("d", 2, "C")],
  discardTop: c("up", 4, "D"),
  goOutCardIds: [] as string[],
  lastTurnNames: [] as string[],
  acePoints: 15 as const,
  wildFaceValue: true,
  currentPlayerName: "Ada",
};

describe("coach advice", () => {
  it("suggests the stock when the upcard does not help", () => {
    const tip = coachAdvice(base);
    expect(tip?.action).toBe("drawStock");
    expect(tip?.body).toMatch(/stock/i);
  });

  it("suggests taking a wild upcard", () => {
    const tip = coachAdvice({ ...base, discardTop: c("up", 3, "H") });
    expect(tip?.action).toBe("takeDiscard");
    expect(tip?.body).toMatch(/wild/i);
  });

  it("points at a go-out discard without playing it", () => {
    const tip = coachAdvice({
      ...base,
      turnPhase: "discard",
      yourHand: [c("a", 9, "H"), c("b", 9, "S"), c("c", 9, "D"), c("d", 2, "C")],
      goOutCardIds: ["d"],
    });
    expect(tip?.action).toBe("goOut");
    expect(tip?.cardId).toBe("d");
    expect(tip?.title).toMatch(/go out/i);
  });

  it("keeps wilds when dumping leftovers", () => {
    const tip = coachAdvice({
      ...base,
      turnPhase: "discard",
      yourHand: [c("w", 3, "H"), c("n", 10, "S"), c("m", 5, "D")],
      goOutCardIds: [],
    });
    expect(tip?.action).toBe("discard");
    expect(tip?.cardId).not.toBe("w");
    expect(tip?.body).toMatch(/natural|wild/i);
  });

  it("explains last licks while waiting", () => {
    const tip = coachAdvice({
      ...base,
      yourTurn: false,
      turnPhase: null,
      lastTurnNames: ["Ada"],
      currentPlayerName: "Ben",
    });
    expect(tip?.title).toMatch(/Last licks/);
    expect(tip?.action).toBeUndefined();
  });

  it("never calls 2s or Aces wild, even if that rank is passed in", () => {
    const wait = coachAdvice({
      ...base,
      yourTurn: false,
      turnPhase: null,
      wildRank: 1,
    });
    expect(wait?.body).toMatch(/3s are wild/);
    expect(wait?.body).not.toMatch(/Aces are wild/);
    expect(wait?.body).not.toMatch(/2s are wild/);

    const aceUp = coachAdvice({
      ...base,
      wildRank: 1,
      discardTop: c("up", 1, "H"),
      yourHand: [c("a", 7, "H"), c("b", 9, "S"), c("d", 4, "C")],
    });
    expect(aceUp?.action).toBe("drawStock");

    const twoUp = coachAdvice({
      ...base,
      wildRank: 2,
      discardTop: c("up", 2, "H"),
      yourHand: [c("a", 7, "H"), c("b", 9, "S"), c("d", 4, "C")],
    });
    expect(twoUp?.action).toBe("drawStock");
  });

  it("explains the recap without forcing the next deal", () => {
    const tip = coachAdvice({ ...base, phase: "round_end", yourTurn: false, turnPhase: null });
    expect(tip?.id).toBe("recap-1");
    expect(tip?.action).toBe("nextRound");
    expect(tip?.actionLabel).toMatch(/Do that for me/);
  });
});
