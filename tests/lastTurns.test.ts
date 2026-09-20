import { describe, expect, it } from "vitest";
import { lastTurnSeatIds } from "../shared/turnOrder";
import {
  addHumanSeat,
  createRoom,
  discardCard,
  startGame,
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
});