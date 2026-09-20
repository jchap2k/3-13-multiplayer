import { describe, expect, it } from "vitest";
import {
  BACK_HINT,
  preferredRoomCode,
  RECONNECTING_HINT,
  reconnectDelayMs,
  ROOM_LOST_HINT,
  roomWasWiped,
} from "../shared/resume";
import {
  addBotSeat,
  addHumanSeat,
  createRoom,
  endGame,
  markConnected,
  setAcePoints,
  setWildFaceValue,
  startGame,
  toClientView,
} from "../server/room";

describe("room resume", () => {
  it("treats a new createdAt on the same code as a wipe", () => {
    expect(roomWasWiped(null, { code: "CEDAR-42", createdAt: 10 })).toBe(false);
    expect(roomWasWiped({ code: "CEDAR-42", createdAt: 10 }, { code: "CEDAR-42", createdAt: 10 })).toBe(
      false,
    );
    expect(roomWasWiped({ code: "CEDAR-42", createdAt: 10 }, { code: "CEDAR-42", createdAt: 99 })).toBe(
      true,
    );
    expect(roomWasWiped({ code: "CEDAR-42", createdAt: 10 }, { code: "KITE-7", createdAt: 99 })).toBe(
      false,
    );
    expect(ROOM_LOST_HINT).toMatch(/restarted/);
    expect(RECONNECTING_HINT).toMatch(/Reconnecting/);
    expect(BACK_HINT).toMatch(/same seat/);
  });

  it("prefers a valid URL room and falls back to the saved session", () => {
    expect(preferredRoomCode("kite-7", "CEDAR-42")).toBe("KITE-7");
    expect(preferredRoomCode(null, "cedar-42")).toBe("CEDAR-42");
    expect(preferredRoomCode("PLAY-A", "CEDAR-42")).toBe("CEDAR-42");
    expect(preferredRoomCode("", null)).toBeNull();
    expect(reconnectDelayMs(0)).toBe(800);
    expect(reconnectDelayMs(1)).toBe(1600);
    expect(reconnectDelayMs(8)).toBe(5000);
  });

  it("restores the same seat and hand when the in-memory room still exists", () => {
    const room = createRoom("CEDAR-42");
    expect(addHumanSeat(room, "p1", "Ada")).toBeNull();
    expect(addHumanSeat(room, "p2", "Ben")).toBeNull();
    expect(startGame(room, "p1")).toBeNull();
    const createdAt = room.createdAt;
    const hand = toClientView(room, "p1").yourHand.map((card) => card.id);
    expect(hand.length).toBeGreaterThan(0);
    markConnected(room, "p1", false);
    const away = toClientView(room, "p1");
    expect(away.seated).toBe(true);
    expect(away.players.find((player) => player.id === "p1")?.connected).toBe(false);
    expect(away.yourHand.map((card) => card.id)).toEqual(hand);
    markConnected(room, "p1", true);
    const view = toClientView(room, "p1");
    expect(view.seated).toBe(true);
    expect(view.phase).toBe("playing");
    expect(view.createdAt).toBe(createdAt);
    expect(view.players.find((player) => player.id === "p1")?.connected).toBe(true);
    expect(view.yourHand.map((card) => card.id)).toEqual(hand);
    expect(view.round).toBe(1);
  });

  it("leaves bots and host End game intact across a human drop", () => {
    const room = createRoom("FLINT-9");
    expect(addHumanSeat(room, "host", "Pat")).toBeNull();
    expect(addBotSeat(room, "Riley")).toBeNull();
    expect(startGame(room, "host")).toBeNull();
    markConnected(room, "host", false);
    expect(room.seats.some((seat) => seat.isBot)).toBe(true);
    expect(endGame(room, "host")).toBeNull();
    expect(room.phase).toBe("lobby");
    expect(room.seats.map((seat) => seat.id)).toEqual(["host", room.seats[1]?.id]);
  });
});

describe("ace scoring house rule", () => {
  it("defaults to 15 and locks after start", () => {
    const room = createRoom("ACES-1");
    addHumanSeat(room, "p1", "Ada");
    addHumanSeat(room, "p2", "Ben");
    expect(room.acePoints).toBe(15);
    expect(setAcePoints(room, 1)).toBeNull();
    expect(room.acePoints).toBe(1);
    expect(toClientView(room, "p1").acePoints).toBe(1);
    expect(startGame(room, "p1")).toBeNull();
    expect(setAcePoints(room, 15)).toBe("House rules are locked after the start.");
    expect(room.acePoints).toBe(1);
  });
});

describe("caught wilds face-value house rule", () => {
  it("defaults on and locks after start", () => {
    const room = createRoom("WILDS-1");
    addHumanSeat(room, "p1", "Ada");
    addHumanSeat(room, "p2", "Ben");
    expect(room.wildFaceValue).toBe(true);
    expect(toClientView(room, "p1").wildFaceValue).toBe(true);
    expect(setWildFaceValue(room, false)).toBeNull();
    expect(room.wildFaceValue).toBe(false);
    expect(toClientView(room, "p1").wildFaceValue).toBe(false);
    expect(setWildFaceValue(room, true)).toBeNull();
    expect(startGame(room, "p1")).toBeNull();
    expect(setWildFaceValue(room, false)).toBe("House rules are locked after the start.");
    expect(room.wildFaceValue).toBe(true);
  });
});
