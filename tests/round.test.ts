import { describe, expect, it } from "vitest";
import {
  addBotSeat,
  createRoom,
  nextRound,
  playBotTurn,
  startGame,
} from "../server/room";

function playUntilSettled(room: ReturnType<typeof createRoom>, limit = 800) {
  let steps = 0;
  while (room.phase === "playing" && steps < limit) {
    const seat = room.seats.find((item) => item.id === room.currentSeatId);
    if (!seat) break;
    playBotTurn(room, seat);
    steps += 1;
  }
  return steps;
}

describe("full round with bots", () => {
  it("completes deal → play → go-out → score for two bots", () => {
    const room = createRoom("TEST-1");
    expect(addBotSeat(room, "Alex")).toBeNull();
    expect(addBotSeat(room, "Sam")).toBeNull();
    expect(startGame(room)).toBeNull();

    expect(room.phase).toBe("playing");
    expect(room.round).toBe(1);
    expect(room.seats.every((seat) => seat.hand.length === 3)).toBe(true);
    expect(room.discard).toHaveLength(1);
    expect(room.stock.length).toBe(52 - 3 * 2 - 1);

    const steps = playUntilSettled(room);
    expect(room.phase).toBe("round_end");
    expect(room.seats.every((seat) => seat.roundScores.length === 1)).toBe(true);
    if (room.wentOutId) {
      const gone = room.seats.find((seat) => seat.id === room.wentOutId);
      expect(gone?.roundScores[0]).toBe(0);
    }
    expect(steps).toBeGreaterThan(0);
  });

  it("starts round 2 with 4s wild and one more card", () => {
    const room = createRoom("TEST-2");
    addBotSeat(room, "Alex");
    addBotSeat(room, "Sam");
    addBotSeat(room, "Jordan");
    startGame(room);
    playUntilSettled(room);
    expect(nextRound(room)).toBeNull();
    expect(room.phase).toBe("playing");
    expect(room.round).toBe(2);
    expect(room.seats.every((seat) => seat.hand.length === 4)).toBe(true);
    expect(room.stock.length).toBe(52 - 4 * 3 - 1);
  });

  it("uses two decks at four seats", () => {
    const room = createRoom("TEST-4");
    for (const name of ["A", "B", "C", "D"]) addBotSeat(room, name);
    startGame(room);
    expect(room.stock.length + 1 + 4 * 3).toBe(104);
  });

  it("plays a full 11-round match with two bots", { timeout: 30_000 }, () => {
    const room = createRoom("TEST-11");
    addBotSeat(room, "Alex");
    addBotSeat(room, "Sam");
    startGame(room);
    for (let round = 1; round <= 11; round++) {
      playUntilSettled(room, 2000);
      expect(room.seats.every((seat) => seat.roundScores.length === round)).toBe(true);
      if (round < 11) {
        expect(room.phase).toBe("round_end");
        expect(nextRound(room)).toBeNull();
        expect(room.round).toBe(round + 1);
      }
    }
    expect(room.phase).toBe("match_end");
    expect(room.winnerIds.length).toBeGreaterThan(0);
  });
});
