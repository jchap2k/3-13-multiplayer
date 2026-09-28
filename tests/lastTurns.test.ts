import { describe, expect, it } from "vitest";
import { lastTurnSeatIds } from "../shared/turnOrder";
import {
  addHumanSeat,
  createRoom,
  discardCard,
  drawStock,
  startGame,
  toClientView,
} from "../server/room";
import type { Card } from "../shared/types";

function c(id: string, rank: number, suit: Card["suit"]): Card {
  return { id, rank: rank as Card["rank"], suit };
}

describe("last turns after a go-out", () => {
  it("keeps the same seating direction: John → Dad → Annie", () => {
    expect(lastTurnSeatIds(["john", "dad", "annie"], "dad")).toEqual(["annie", "john"]);
    expect(lastTurnSeatIds(["john", "dad", "annie"], "john")).toEqual(["dad", "annie"]);
    expect(lastTurnSeatIds(["john", "dad", "annie"], "annie")).toEqual(["john", "dad"]);
  });

  it("gives the next seat the first last-lick, not the previous seat", () => {
    const room = createRoom("LICK-1");
    addHumanSeat(room, "john", "John");
    addHumanSeat(room, "dad", "Dad");
    addHumanSeat(room, "annie", "Annie");
    startGame(room, "john");
    const dad = room.seats.find((seat) => seat.id === "dad")!;
    dad.hand = [c("a", 9, "H"), c("b", 9, "S"), c("c", 9, "D"), c("d", 2, "C")];
    room.currentSeatId = "dad";
    room.turnPhase = "discard";
    expect(discardCard(room, "dad", "d")).toBeNull();
    expect(room.wentOutId).toBe("dad");
    expect(room.lastTurnQueue).toEqual(["annie", "john"]);
    expect(room.currentSeatId).toBe("annie");
    expect(room.phase).toBe("playing");
  });

  it("sends the go-out melds for an optional reveal, including after the round scores", () => {
    const room = createRoom("SHOW-1");
    addHumanSeat(room, "john", "John");
    addHumanSeat(room, "dad", "Dad");
    addHumanSeat(room, "annie", "Annie");
    startGame(room, "john");
    expect(toClientView(room, "john").wentOutMelds).toBeNull();
    const dad = room.seats.find((seat) => seat.id === "dad")!;
    dad.hand = [c("a", 9, "H"), c("b", 9, "S"), c("c", 9, "D"), c("d", 2, "C")];
    room.currentSeatId = "dad";
    room.turnPhase = "discard";
    expect(discardCard(room, "dad", "d")).toBeNull();

    const during = toClientView(room, "annie");
    expect(during.wentOutId).toBe("dad");
    expect(during.wentOutMelds).toHaveLength(1);
    expect(during.wentOutMelds?.flat().map((card) => card.id).sort()).toEqual(["a", "b", "c"]);
    expect(during.yourHand.every((card) => !["a", "b", "c"].includes(card.id))).toBe(true);

    const annie = room.seats.find((seat) => seat.id === "annie")!;
    expect(drawStock(room, "annie")).toBeNull();
    annie.hand = [c("e", 4, "H"), c("f", 7, "S"), c("g", 10, "D"), c("h", 2, "C")];
    expect(discardCard(room, "annie", "h")).toBeNull();
    const john = room.seats.find((seat) => seat.id === "john")!;
    expect(drawStock(room, "john")).toBeNull();
    john.hand = [c("i", 5, "H"), c("j", 8, "S"), c("k", 11, "D"), c("l", 3, "C")];
    expect(discardCard(room, "john", "l")).toBeNull();

    expect(room.phase).toBe("round_end");
    const scored = toClientView(room, "john");
    expect(scored.wentOutMelds?.flat().map((card) => card.id).sort()).toEqual(["a", "b", "c"]);
    expect(scored.revealed?.find((row) => row.playerId === "dad")?.melds.flat().map((card) => card.id).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});