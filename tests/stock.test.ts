import { describe, expect, it } from "vitest";
import {
  addHumanSeat,
  createRoom,
  drawStock,
  reshuffleIfNeeded,
  startGame,
  takeDiscard,
} from "../server/room";
import type { Card } from "../shared/types";

function c(id: string, rank: number, suit: Card["suit"]): Card {
  return { id, rank: rank as Card["rank"], suit };
}

function playingRoom(code: string) {
  const room = createRoom(code);
  addHumanSeat(room, "p1", "Ada");
  addHumanSeat(room, "p2", "Ben");
  startGame(room, "p1");
  room.currentSeatId = "p1";
  room.turnPhase = "draw";
  return room;
}

describe("empty stock reshuffle", () => {
  it("keeps the face-up discard and shuffles the rest into the stock", () => {
    const room = playingRoom("SHOE-1");
    const top = c("up", 9, "H");
    const buried = [c("a", 2, "S"), c("b", 4, "D"), c("c", 6, "C")];
    room.stock = [];
    room.discard = [...buried, top];
    expect(reshuffleIfNeeded(room)).toBe(true);
    expect(room.discard).toEqual([top]);
    expect(room.stock).toHaveLength(3);
    expect(new Set(room.stock.map((card) => card.id))).toEqual(new Set(["a", "b", "c"]));
  });

  it("does not bury the upcard when someone draws the empty stock", () => {
    const room = playingRoom("SHOE-2");
    const top = c("up", 12, "S");
    room.stock = [];
    room.discard = [c("a", 2, "H"), c("b", 5, "D"), top];
    expect(drawStock(room, "p1")).toBeNull();
    expect(room.discard).toEqual([top]);
    expect(room.stock).toHaveLength(1);
    expect(room.seats[0].hand.some((card) => card.id === "up")).toBe(false);
    expect(room.message).toMatch(/shuffled/);
  });

  it("blocks a stock draw when only the upcard is left", () => {
    const room = playingRoom("SHOE-3");
    const top = c("up", 8, "C");
    room.stock = [];
    room.discard = [top];
    expect(reshuffleIfNeeded(room)).toBe(false);
    expect(drawStock(room, "p1")).toBe("Stock is empty. Take the face-up discard.");
    expect(room.discard).toEqual([top]);
    expect(room.turnPhase).toBe("draw");
    expect(takeDiscard(room, "p1")).toBeNull();
    expect(room.seats[0].hand.some((card) => card.id === "up")).toBe(true);
    expect(room.discard).toHaveLength(0);
  });

  it("scores deadwood when both piles are empty", () => {
    const room = playingRoom("SHOE-4");
    room.stock = [];
    room.discard = [];
    expect(drawStock(room, "p1")).toBeNull();
    expect(room.phase).toBe("round_end");
    expect(room.message).toMatch(/No cards left to draw/);
    expect(room.seats.every((seat) => seat.roundScores.length === 1)).toBe(true);
  });
});
