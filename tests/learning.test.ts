import { describe, expect, it } from "vitest";
import {
  isLearningMode,
  LEARNING_LABEL,
  parseLearningFlag,
} from "../shared/learning";
import { loadLearning } from "../client/lib/learningPref";
import { addHumanSeat, createRoom, setSeatLearning, startGame } from "../server/room";

describe("learning stats skip", () => {
  it("defaults off and only follows the explicit flag", () => {
    expect(isLearningMode(undefined)).toBe(false);
    expect(isLearningMode({ learning: true })).toBe(true);
    expect(parseLearningFlag(null)).toBe(false);
    expect(parseLearningFlag("1")).toBe(true);
    expect(parseLearningFlag("0")).toBe(false);
    expect(loadLearning(null)).toBe(false);
    expect(loadLearning("1")).toBe(true);
    expect(LEARNING_LABEL).toMatch(/don't write to Stats/i);
  });

  it("new seats start off Stats-skip and lock the flag at Start", () => {
    const room = createRoom("LEARN-0");
    expect(addHumanSeat(room, "p1", "Ada")).toBeNull();
    expect(addHumanSeat(room, "p2", "Ben")).toBeNull();
    expect(room.seats[0]?.learning).toBe(false);
    expect(room.seats[0]?.learningMatch).toBe(false);
    setSeatLearning(room, "p1", true);
    expect(startGame(room, "p1")).toBeNull();
    setSeatLearning(room, "p1", false);
    expect(room.seats.find((seat) => seat.id === "p1")?.learning).toBe(false);
    expect(room.seats.find((seat) => seat.id === "p1")?.learningMatch).toBe(true);
  });
});
