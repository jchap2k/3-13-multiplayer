import { describe, expect, it } from "vitest";
import {
  DEFAULT_A11Y,
  DOUBLE_TAP_MS,
  LONG_PRESS_MS,
  gestureDiscardKind,
  loadA11y,
  resolveCardRelease,
} from "../client/lib/a11y";
import { shouldPlayTurnSound } from "../client/lib/turnSound";
import { wentOutFlashKey } from "../client/lib/wentOutFlash";
import { addHumanSeat, createRoom, discardCard, startGame } from "../server/room";
import type { Card } from "../shared/types";

function c(id: string, rank: number, suit: Card["suit"]): Card {
  return { id, rank: rank as Card["rank"], suit };
}

describe("a11y prefs", () => {
  it("defaults bigger pips, wild marks, turn sound, and chat overlay on for first-time browsers", () => {
    expect(DEFAULT_A11Y).toEqual({
      largePips: true,
      markWilds: true,
      doubleDiscard: false,
      longDiscard: false,
      turnSound: true,
      chatOverlay: true,
    });
    expect(loadA11y(null)).toEqual(DEFAULT_A11Y);
    expect(loadA11y("{")).toEqual(DEFAULT_A11Y);
    expect(loadA11y(JSON.stringify({ largePips: false, turnSound: false }))).toEqual({
      ...DEFAULT_A11Y,
      largePips: false,
      turnSound: false,
    });
    expect(loadA11y(JSON.stringify({ chatOverlay: false }))).toEqual({
      ...DEFAULT_A11Y,
      chatOverlay: false,
    });
    expect(loadA11y(JSON.stringify({ markWilds: false }))).toEqual({
      ...DEFAULT_A11Y,
      markWilds: false,
    });
    expect(LONG_PRESS_MS).toBe(550);
    expect(DOUBLE_TAP_MS).toBe(400);
  });

  it("treats a fast second tap as a gesture discard when the option is on", () => {
    expect(
      resolveCardRelease({
        moved: false,
        selectable: true,
        alreadySelected: false,
        doubleDiscard: true,
        sameAsLastTap: true,
        msSinceLastTap: 180,
        longPressFired: false,
      }),
    ).toBe("gestureDiscard");
    expect(
      resolveCardRelease({
        moved: false,
        selectable: true,
        alreadySelected: true,
        doubleDiscard: false,
        sameAsLastTap: true,
        msSinceLastTap: 180,
        longPressFired: false,
      }),
    ).toBe("deselect");
    expect(
      resolveCardRelease({
        moved: false,
        selectable: true,
        alreadySelected: true,
        doubleDiscard: true,
        sameAsLastTap: true,
        msSinceLastTap: 900,
        longPressFired: false,
      }),
    ).toBe("deselect");
    expect(
      resolveCardRelease({
        moved: false,
        selectable: true,
        alreadySelected: false,
        doubleDiscard: true,
        sameAsLastTap: true,
        msSinceLastTap: 900,
        longPressFired: false,
      }),
    ).toBe("select");
  });

  it("treats a legal go-out card as go-out on any discard path", () => {
    expect(gestureDiscardKind("a", ["a", "b"])).toBe("goOut");
    expect(gestureDiscardKind("c", ["a", "b"])).toBe("discard");
  });

  it("upgrades a discard to go-out when the rest of the hand is all melds", () => {
    const room = createRoom("OUT-1");
    addHumanSeat(room, "p1", "Ada");
    addHumanSeat(room, "p2", "Ben");
    startGame(room, "p1");
    const ada = room.seats.find((seat) => seat.id === "p1")!;
    ada.hand = [c("a", 9, "H"), c("b", 9, "S"), c("c", 9, "D"), c("d", 2, "C")];
    room.currentSeatId = "p1";
    room.turnPhase = "discard";
    expect(discardCard(room, "p1", "d")).toBeNull();
    expect(room.wentOutId).toBe("p1");
    expect(wentOutFlashKey(room.code, room.round, room.wentOutId)).toBe("OUT-1:1:p1");
    expect(wentOutFlashKey("OUT-1", 1, null)).toBeNull();
  });

  it("plays the turn chime once when this seat becomes the actor", () => {
    expect(shouldPlayTurnSound(null, true)).toBe(true);
    expect(shouldPlayTurnSound(false, true)).toBe(true);
    expect(shouldPlayTurnSound(true, true)).toBe(false);
    expect(shouldPlayTurnSound(true, false)).toBe(false);
    expect(shouldPlayTurnSound(false, false)).toBe(false);
  });
});
