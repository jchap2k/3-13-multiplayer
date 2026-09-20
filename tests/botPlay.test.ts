import { describe, expect, it } from "vitest";
import { botPlayBadge, isStandInToast } from "../shared/botPlay";
import {
  addBotSeat,
  addHumanSeat,
  createRoom,
  endGame,
  markConnected,
  maybeAct,
  playBotTurn,
  setBotPlay,
  startGame,
  toClientView,
} from "../server/room";

function table() {
  const room = createRoom("AUTO-1");
  addHumanSeat(room, "host", "Pat");
  addHumanSeat(room, "alex", "Alex");
  addBotSeat(room, "Riley");
  startGame(room, "host");
  return room;
}

describe("host Auto-play for a human seat", () => {
  it("lets only the host check Auto-play on a human, not a filler bot", () => {
    const room = table();
    expect(setBotPlay(room, "alex", "alex", true)).toBe("Only the host can turn Auto-play on for a seat.");
    const bot = room.seats.find((seat) => seat.isBot)!;
    expect(setBotPlay(room, "host", bot.id, true)).toBe("That seat is already a bot.");
    expect(setBotPlay(room, "host", "alex", true)).toBeNull();
    expect(room.seats.find((seat) => seat.id === "alex")?.botPlay).toBe(true);
    expect(toClientView(room, "host").players.find((player) => player.id === "alex")?.botPlay).toBe(true);
    expect(toClientView(room, "host").players.find((player) => player.isBot)?.botPlay).toBe(false);
    expect(room.message).toMatch(/Auto-play on for Alex/);
  });

  it("plays that seat with bot logic even when house idle auto-move is off", () => {
    const room = table();
    expect(room.autoMove).toBe(false);
    expect(setBotPlay(room, "host", "alex", true)).toBeNull();
    const alex = room.seats.find((seat) => seat.id === "alex")!;
    let steps = 0;
    while (room.phase === "playing" && room.currentSeatId !== "alex" && steps < 24) {
      const current = room.seats.find((seat) => seat.id === room.currentSeatId);
      if (!current) break;
      playBotTurn(room, current);
      steps += 1;
    }
    if (room.phase !== "playing") return;
    expect(room.currentSeatId).toBe("alex");
    expect(room.turnEndsAt).not.toBeNull();
    room.turnEndsAt = Date.now() - 1;
    expect(maybeAct(room)).toBe(true);
    expect(room.message).toMatch(/Auto-play moved for Alex/);
    expect(alex.botPlay).toBe(true);
    expect(alex.isBot).toBe(false);
    expect(alex.name).toBe("Alex");
    expect(room.currentSeatId).not.toBe("alex");
  });

  it("unchecks Auto-play as soon as that player reconnects", () => {
    const room = table();
    expect(setBotPlay(room, "host", "alex", true)).toBeNull();
    markConnected(room, "alex", false);
    expect(room.seats.find((seat) => seat.id === "alex")?.botPlay).toBe(true);
    markConnected(room, "alex", true);
    const seat = room.seats.find((seat) => seat.id === "alex")!;
    expect(seat.botPlay).toBe(false);
    expect(seat.connected).toBe(true);
    expect(room.message).toMatch(/Alex is back — Auto-play off/);
    expect(toClientView(room, "alex").players.find((player) => player.id === "alex")?.botPlay).toBe(false);
  });

  it("lets the host uncheck before they return, and keeps End game + bots", () => {
    const room = table();
    expect(setBotPlay(room, "host", "alex", true)).toBeNull();
    expect(setBotPlay(room, "host", "alex", false)).toBeNull();
    expect(room.seats.find((seat) => seat.id === "alex")?.botPlay).toBe(false);
    expect(room.message).toMatch(/Auto-play off for Alex/);
    expect(endGame(room, "host")).toBeNull();
    expect(room.phase).toBe("lobby");
    expect(room.seats.some((seat) => seat.isBot)).toBe(true);
  });

  it("labels the badge for connected vs away", () => {
    expect(botPlayBadge({ isBot: false, botPlay: true, connected: true })).toBe("auto-play");
    expect(botPlayBadge({ isBot: false, botPlay: true, connected: false })).toBe("away+auto");
    expect(botPlayBadge({ isBot: true, botPlay: true, connected: true })).toBe("");
    expect(isStandInToast("Auto-play on for Alex.")).toBe(true);
    expect(isStandInToast("Ada was idle — the table made a legal move.")).toBe(false);
  });
});