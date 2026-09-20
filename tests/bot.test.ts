import { describe, expect, it } from "vitest";
import { isWild } from "../shared/cards";
import { chooseDiscard } from "../shared/bot";
import { addBotSeat, createRoom, nextRound, playBotTurn, startGame } from "../server/room";
import type { Card } from "../shared/types";

function c(id: string, rank: number, suit: Card["suit"]): Card {
  return { id, rank: rank as Card["rank"], suit };
}

describe("bot keeps wilds", () => {
  it("never discards a wild when a non-wild exists", () => {
    const hand = [c("wild", 4, "H"), c("nine", 9, "S"), c("king", 13, "D")];
    const pick = chooseDiscard(hand, 4);
    expect(pick.cardId).not.toBe("wild");
    const thrown = hand.find((card) => card.id === pick.cardId)!;
    expect(isWild(thrown, 4)).toBe(false);
  });

  it("never discards a joker when a natural exists", () => {
    const hand = [c("j", 0, "J"), c("eight", 8, "C"), c("two", 2, "H")];
    const pick = chooseDiscard(hand, 3);
    expect(pick.cardId).not.toBe("j");
  });

  it("may discard a wild only when every card is wild", () => {
    const hand = [c("a", 4, "H"), c("b", 4, "S"), c("j", 0, "J")];
    const pick = chooseDiscard(hand, 4);
    expect(["a", "b", "j"]).toContain(pick.cardId);
    expect(isWild(hand.find((card) => card.id === pick.cardId)!, 4)).toBe(true);
  });

  it("treats 2s and Aces as naturals even if wildRank is wrongly 1 or 2", () => {
    expect(isWild(c("two", 2, "H"), 2)).toBe(false);
    expect(isWild(c("ace", 1, "H"), 1)).toBe(false);
    const withTwo = [c("two", 2, "H"), c("nine", 9, "S"), c("king", 13, "D")];
    expect(chooseDiscard(withTwo, 2).cardId).toBe("king");
    const withAce = [c("ace", 1, "H"), c("nine", 9, "S"), c("four", 4, "D")];
    expect(chooseDiscard(withAce, 1).cardId).toBe("ace");
  });

  it("prefers dumping the higher deadwood natural", () => {
    const hand = [c("wild", 3, "H"), c("two", 2, "S"), c("king", 13, "D")];
    const pick = chooseDiscard(hand, 3);
    expect(pick.cardId).toBe("king");
    expect(pick.goOut).toBe(false);
  });
});

describe("four-player deal", () => {
  it("deals round 2 with 4s wild on two decks and survives a bot turn", () => {
    const room = createRoom("FOUR-2");
    for (const name of ["A", "B", "C", "D"]) addBotSeat(room, name);
    startGame(room);
    expect(room.stock.length + 1 + 4 * 3).toBe(104);
    let steps = 0;
    while (room.phase === "playing" && steps < 800) {
      const seat = room.seats.find((item) => item.id === room.currentSeatId);
      if (!seat) break;
      playBotTurn(room, seat);
      steps += 1;
    }
    expect(room.phase).toBe("round_end");
    expect(nextRound(room)).toBeNull();
    expect(room.round).toBe(2);
    expect(room.seats.every((seat) => seat.hand.length === 4)).toBe(true);
    const lead = room.seats.find((seat) => seat.id === room.currentSeatId)!;
    expect(() => playBotTurn(room, lead)).not.toThrow();
  });
});
