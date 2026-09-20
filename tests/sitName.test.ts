import { describe, expect, it } from "vitest";
import {
  hasSitName,
  joinNeedsNamePrompt,
  NEED_SIT_NAME,
  normalizeSitName,
} from "../shared/sitName";
import { addBotSeat, addHumanSeat, createRoom, startGame } from "../server/room";
import { howtoMentions } from "../shared/howto";

describe("sit name", () => {
  it("trims and rejects empty names", () => {
    expect(normalizeSitName("  Dad  ")).toBe("Dad");
    expect(normalizeSitName("")).toBe("");
    expect(normalizeSitName("   ")).toBe("");
    expect(hasSitName("John")).toBe(true);
    expect(hasSitName("  ")).toBe(false);
    expect(joinNeedsNamePrompt("")).toBe(true);
    expect(joinNeedsNamePrompt("Ada")).toBe(false);
  });

  it("refuses a blank sit and a start with a blank human seat", () => {
    const room = createRoom("NAME-1");
    expect(addHumanSeat(room, "p1", "   ")).toBe(NEED_SIT_NAME);
    expect(addHumanSeat(room, "p1", "")).toBe(NEED_SIT_NAME);
    expect(addHumanSeat(room, "p1", "Ada")).toBeNull();
    addBotSeat(room, "Bot");
    room.seats[0]!.name = "";
    expect(startGame(room, "p1")).toBe(NEED_SIT_NAME);
    room.seats[0]!.name = "Ada";
    expect(startGame(room, "p1")).toBeNull();
  });

  it("keeps How to play copy that names are never 2/Ace wild", () => {
    expect(howtoMentions()).toMatch(/2s and Aces are never wild/);
  });
});
