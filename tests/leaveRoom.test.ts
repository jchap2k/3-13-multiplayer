import { describe, expect, it } from "vitest";
import {
  addBotSeat,
  addHumanSeat,
  createRoom,
  leaveSeat,
  removeSeat,
  startGame,
} from "../server/room";

describe("leave room", () => {
  it("stands up in the lobby without ending the table", () => {
    const room = createRoom("LEAVE-0");
    expect(addHumanSeat(room, "ada", "Ada")).toBeNull();
    expect(addHumanSeat(room, "ben", "Ben")).toBeNull();
    expect(leaveSeat(room, "ada")).toBeNull();
    expect(room.phase).toBe("lobby");
    expect(room.seats.map((seat) => seat.id)).toEqual(["ben"]);
    expect(room.hostId).toBe("ben");
    expect(room.message).toMatch(/Ada left/);
    expect(room.message).toMatch(/Ben is host/);
  });

  it("lets a guest leave mid-hand; the host and table keep playing", () => {
    const room = createRoom("LEAVE-1");
    expect(addHumanSeat(room, "ada", "Ada")).toBeNull();
    expect(addHumanSeat(room, "ben", "Ben")).toBeNull();
    expect(addBotSeat(room, "Riley", "ada")).toBeNull();
    expect(startGame(room, "ada")).toBeNull();
    expect(room.phase).toBe("playing");
    const current = room.currentSeatId;
    expect(leaveSeat(room, "ben")).toBeNull();
    expect(room.phase).toBe("playing");
    expect(room.seats.map((seat) => seat.id)).not.toContain("ben");
    expect(room.hostId).toBe("ada");
    expect(room.seats).toHaveLength(2);
    if (current === "ben") {
      expect(room.currentSeatId).not.toBe("ben");
      expect(room.turnPhase).toBe("draw");
    }
  });

  it("transfers host when the host leaves a live table", () => {
    const room = createRoom("LEAVE-2");
    expect(addHumanSeat(room, "ada", "Ada")).toBeNull();
    expect(addHumanSeat(room, "ben", "Ben")).toBeNull();
    expect(addBotSeat(room, "Riley", "ada")).toBeNull();
    expect(startGame(room, "ada")).toBeNull();
    expect(leaveSeat(room, "ada")).toBeNull();
    expect(room.phase).toBe("playing");
    expect(room.hostId).toBe("ben");
    expect(room.message).toMatch(/Ben is host/);
  });

  it("returns the room to lobby when only one seat would remain", () => {
    const room = createRoom("LEAVE-3");
    expect(addHumanSeat(room, "ada", "Ada")).toBeNull();
    expect(addHumanSeat(room, "ben", "Ben")).toBeNull();
    expect(startGame(room, "ada")).toBeNull();
    expect(leaveSeat(room, "ben")).toBeNull();
    expect(room.phase).toBe("lobby");
    expect(room.seats.map((seat) => seat.id)).toEqual(["ada"]);
    expect(room.message).toMatch(/Need two to play/);
  });

  it("does not orphan a bot-only table when the last human leaves", () => {
    const room = createRoom("LEAVE-4");
    expect(addHumanSeat(room, "ada", "Ada")).toBeNull();
    expect(addBotSeat(room, "Riley", "ada")).toBeNull();
    expect(startGame(room, "ada")).toBeNull();
    expect(leaveSeat(room, "ada")).toBeNull();
    expect(room.phase).toBe("lobby");
    expect(room.seats.every((seat) => seat.isBot)).toBe(true);
    expect(room.message).toMatch(/Need two to play/);
  });

  it("keeps host-remove of other seats lobby-only", () => {
    const room = createRoom("LEAVE-5");
    expect(addHumanSeat(room, "ada", "Ada")).toBeNull();
    expect(addHumanSeat(room, "ben", "Ben")).toBeNull();
    expect(startGame(room, "ada")).toBeNull();
    expect(removeSeat(room, "ben")).toBe("Can't remove players after the deal.");
    expect(room.seats.map((seat) => seat.id)).toEqual(["ada", "ben"]);
    expect(leaveSeat(room, "nobody")).toBeNull();
  });
});
