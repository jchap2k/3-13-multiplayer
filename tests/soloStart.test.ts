import { describe, expect, it } from "vitest";
import {
  isSoloStartBotToast,
  shouldAutoAddSoloBot,
  SOLO_START_BOT_NOTE,
} from "../shared/soloStart";
import { addBotSeat, addHumanSeat, createRoom, startGame } from "../server/room";

describe("solo start auto-bot", () => {
  it("detects a lone human with no bots", () => {
    expect(shouldAutoAddSoloBot([{ isBot: false }])).toBe(true);
    expect(shouldAutoAddSoloBot([{ isBot: false }, { isBot: true }])).toBe(false);
    expect(shouldAutoAddSoloBot([{ isBot: false }, { isBot: false }])).toBe(false);
    expect(shouldAutoAddSoloBot([{ isBot: true }])).toBe(false);
    expect(isSoloStartBotToast(`${SOLO_START_BOT_NOTE}. Round 1`)).toBe(true);
    expect(isSoloStartBotToast("Round 1 — 3s are wild")).toBe(false);
  });

  it("adds one bot when a lone host starts, then deals", () => {
    const room = createRoom("SOLO-1");
    expect(addHumanSeat(room, "p1", "Ada")).toBeNull();
    expect(startGame(room, "p1")).toBeNull();
    expect(room.phase).toBe("playing");
    expect(room.seats).toHaveLength(2);
    expect(room.seats.filter((seat) => seat.isBot)).toHaveLength(1);
    expect(room.seats.filter((seat) => !seat.isBot)).toHaveLength(1);
    expect(room.message).toMatch(SOLO_START_BOT_NOTE);
    expect(room.seats.every((seat) => seat.hand.length === 3)).toBe(true);
  });

  it("does not add a bot when another human or a bot is already seated", () => {
    const twoHumans = createRoom("SOLO-2");
    addHumanSeat(twoHumans, "p1", "Ada");
    addHumanSeat(twoHumans, "p2", "Ben");
    expect(startGame(twoHumans, "p1")).toBeNull();
    expect(twoHumans.seats.filter((seat) => seat.isBot)).toHaveLength(0);
    expect(twoHumans.message).not.toMatch(SOLO_START_BOT_NOTE);

    const withBot = createRoom("SOLO-3");
    addHumanSeat(withBot, "host", "Pat");
    addBotSeat(withBot, "Riley");
    expect(startGame(withBot, "host")).toBeNull();
    expect(withBot.seats.filter((seat) => seat.isBot)).toHaveLength(1);
    expect(withBot.message).not.toMatch(SOLO_START_BOT_NOTE);
  });

  it("lets only the host add a bot", () => {
    const room = createRoom("BOT-H");
    addHumanSeat(room, "p1", "Ada");
    addHumanSeat(room, "p2", "Ben");
    expect(addBotSeat(room, "Riley", "p2")).toBe("Only the host can add a bot.");
    expect(addBotSeat(room, "Riley", "p1")).toBeNull();
    expect(room.seats.some((seat) => seat.isBot)).toBe(true);
  });
});
