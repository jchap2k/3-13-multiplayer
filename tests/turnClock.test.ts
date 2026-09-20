import { describe, expect, it } from "vitest";
import { formatTurnClock, HUMAN_TURN_MS, HUMAN_TURN_SECONDS } from "../shared/turnClock";

describe("idle auto-move clock", () => {
  it("is 3 minutes / 180 seconds", () => {
    expect(HUMAN_TURN_SECONDS).toBe(180);
    expect(HUMAN_TURN_MS).toBe(180_000);
    expect(formatTurnClock(HUMAN_TURN_SECONDS)).toBe("3:00");
    expect(formatTurnClock(179)).toBe("2:59");
    expect(formatTurnClock(60)).toBe("1:00");
    expect(formatTurnClock(59)).toBe("0:59");
    expect(formatTurnClock(0)).toBe("0:00");
  });
});
