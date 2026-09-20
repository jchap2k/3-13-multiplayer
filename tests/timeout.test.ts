import { describe, expect, it } from "vitest";
import { isValidRoomCode, pendingInvalidRoom, ROOM_CODE_HINT } from "../shared/roomCode";
import {
  ABSENT_TURN_MS,
  addBotSeat,
  addHumanSeat,
  createRoom,
  HUMAN_TURN_MS,
  markConnected,
  maybeAct,
  playBotTurn,
  setAutoMove,
  startGame,
} from "../server/room";

function twoHumans(code: string, autoMove = true) {
  const room = createRoom(code);
  addHumanSeat(room, "p1", "Ada");
  addHumanSeat(room, "p2", "Ben");
  if (autoMove) setAutoMove(room, true);
  startGame(room, "p1");
  return room;
}

describe("human turn timeout", () => {
  it("advances a stalled two-human table when the deadline expires", () => {
    const room = twoHumans("IDLE-1");
    expect(room.phase).toBe("playing");
    expect(room.turnEndsAt).not.toBeNull();

    const first = room.currentSeatId;
    expect(first).toBeTruthy();
    const firstHand = room.seats.find((seat) => seat.id === first)!.hand.length;

    room.turnEndsAt = Date.now() - 1;
    expect(maybeAct(room)).toBe(true);
    expect(room.currentSeatId).not.toBe(first);
    expect(room.seats.find((seat) => seat.id === first)!.hand.length).toBe(firstHand);
    expect(room.message).toMatch(/Ada|Ben/);
    expect(room.message).toMatch(/idle/);
    expect(room.turnEndsAt).toBeGreaterThan(Date.now());
  });

  it("does not extend a live deadline on reconnect", () => {
    const room = twoHumans("IDLE-2");
    const live = Date.now() + 18_000;
    room.turnEndsAt = live;
    markConnected(room, room.currentSeatId!, true);
    expect(room.turnEndsAt).toBe(live);
  });

  it("does not restart an already-expired deadline on hello", () => {
    const room = twoHumans("IDLE-3");
    const expired = Date.now() - 5_000;
    room.turnEndsAt = expired;
    markConnected(room, room.currentSeatId!, true);
    expect(room.turnEndsAt).toBe(expired);
    expect(maybeAct(room)).toBe(true);
    expect(room.message).toMatch(/idle/);
  });

  it("shortens the clock when the current human disconnects", () => {
    const room = twoHumans("IDLE-4");
    room.turnEndsAt = Date.now() + HUMAN_TURN_MS;
    const before = Date.now();
    markConnected(room, room.currentSeatId!, false);
    expect(room.turnEndsAt).toBeGreaterThanOrEqual(before);
    expect(room.turnEndsAt).toBeLessThanOrEqual(before + ABSENT_TURN_MS + 50);
  });

  it("after one full human turn, auto-plays the idle partner at HUMAN_TURN_MS", () => {
    expect(HUMAN_TURN_MS).toBe(180_000);
    const room = twoHumans("IDLE-6");
    const first = room.seats.find((seat) => seat.id === room.currentSeatId)!;
    playBotTurn(room, first);
    const partnerId = room.currentSeatId;
    expect(partnerId).toBeTruthy();
    expect(partnerId).not.toBe(first.id);
    expect(room.phase).toBe("playing");
    expect(room.turnPhase).toBe("draw");
    const partner = room.seats.find((seat) => seat.id === partnerId)!;
    const partnerHand = partner.hand.length;
    const stockBefore = room.stock.length;
    const discardBefore = room.discard.length;
    const armed = room.turnEndsAt;
    expect(armed).toBeGreaterThan(Date.now() + HUMAN_TURN_MS - 50);
    expect(armed).toBeLessThanOrEqual(Date.now() + HUMAN_TURN_MS);

    expect(maybeAct(room, armed! - 1)).toBe(false);
    expect(room.currentSeatId).toBe(partnerId);

    expect(maybeAct(room, armed!)).toBe(true);
    expect(room.currentSeatId).not.toBe(partnerId);
    if (room.phase === "playing") {
      expect(room.turnPhase).toBe("draw");
      expect(partner.hand.length).toBe(partnerHand);
      expect(room.stock.length + room.discard.length).toBe(stockBefore + discardBefore);
    } else {
      expect(["round_end", "match_end"]).toContain(room.phase);
    }
    expect(room.message).toMatch(/idle/);
    expect(room.message).toMatch(/legal move/);
  });

  it("acts immediately if a human turn has no deadline", () => {
    const room = twoHumans("IDLE-5");
    room.turnEndsAt = null;
    expect(maybeAct(room)).toBe(true);
    expect(room.message).toMatch(/idle/);
  });

  it("does not auto-move humans when the house option is off", () => {
    const room = twoHumans("IDLE-OFF", false);
    expect(room.autoMove).toBe(false);
    expect(room.turnEndsAt).toBeNull();
    const current = room.currentSeatId;
    expect(maybeAct(room, Date.now() + HUMAN_TURN_MS + 5_000)).toBe(false);
    expect(room.currentSeatId).toBe(current);
  });

  it("defaults auto-move off and locks the house option after start", () => {
    const room = createRoom("IDLE-LOCK");
    addHumanSeat(room, "p1", "Ada");
    addHumanSeat(room, "p2", "Ben");
    expect(room.autoMove).toBe(false);
    expect(setAutoMove(room, true)).toBeNull();
    expect(room.autoMove).toBe(true);
    startGame(room, "p1");
    expect(setAutoMove(room, false)).toBe("House rules are locked after the start.");
    expect(room.autoMove).toBe(true);
  });

  it("still plays bot turns when human auto-move is off", () => {
    const room = createRoom("IDLE-BOT");
    addHumanSeat(room, "p1", "Ada");
    addBotSeat(room, "Rook");
    startGame(room, "p1");
    expect(room.autoMove).toBe(false);
    const human = room.seats.find((seat) => !seat.isBot)!;
    if (room.currentSeatId === human.id) {
      playBotTurn(room, human);
    }
    const bot = room.seats.find((seat) => seat.isBot)!;
    expect(room.currentSeatId).toBe(bot.id);
    expect(room.turnEndsAt).not.toBeNull();
    room.turnEndsAt = Date.now() - 1;
    expect(maybeAct(room)).toBe(true);
    expect(room.currentSeatId).not.toBe(bot.id);
  });
});

describe("host start gate", () => {
  it("lets only the first seater start", () => {
    const room = createRoom("HOST-1");
    addHumanSeat(room, "p1", "Ada");
    addHumanSeat(room, "p2", "Ben");
    expect(room.hostId).toBe("p1");
    expect(startGame(room, "p2")).toBe("Only the host (first to sit) can start the game.");
    expect(room.phase).toBe("lobby");
    expect(startGame(room, "p1")).toBeNull();
    expect(room.phase).toBe("playing");
  });
});

describe("room codes", () => {
  it("rejects PLAY-A and explains WORD-NN", () => {
    expect(isValidRoomCode("KITE-7")).toBe(true);
    expect(isValidRoomCode("PLAY-A")).toBe(false);
    expect(isValidRoomCode("play-a")).toBe(false);
    expect(ROOM_CODE_HINT).toMatch(/KITE-7/);
    expect(ROOM_CODE_HINT).toMatch(/PLAY-A/);
    expect(pendingInvalidRoom("PLAY-A")).toBe("PLAY-A");
    expect(pendingInvalidRoom("?room=PLAY-A".slice(6))).toBe("PLAY-A");
    expect(pendingInvalidRoom("KITE-7")).toBeNull();
    expect(pendingInvalidRoom(null)).toBeNull();
  });
});
