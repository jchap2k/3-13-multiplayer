import { describe, expect, it } from "vitest";
import {
  formatPlayMoney,
  formatStakePath,
  clampStake,
  INITIAL_STAKE,
  STAKE_PRESETS,
  isPerfectSweep,
  nextStake,
  payoutMultiplier,
  settleWager,
  shouldDoubleStake,
  wagerOweLine,
} from "../shared/wager";

describe("wager math", () => {
  it("starts at $5 and doubles only when every total matches", () => {
    expect(INITIAL_STAKE).toBe(5);
    expect(STAKE_PRESETS).toEqual([1, 5, 10, 20]);
    expect(clampStake(0)).toBe(1);
    expect(clampStake(7.6)).toBe(8);
    expect(clampStake(999)).toBe(500);
    expect(nextStake(5)).toBe(10);
    expect(shouldDoubleStake([12, 12, 12])).toBe(true);
    expect(shouldDoubleStake([12, 12, 13])).toBe(false);
    expect(shouldDoubleStake([])).toBe(false);
  });

  it("uses the largest single multiplier and never stacks", () => {
    expect(payoutMultiplier(40, 80, false)).toBe(1);
    expect(payoutMultiplier(40, 101, false)).toBe(2);
    expect(payoutMultiplier(40, 201, false)).toBe(4);
    expect(payoutMultiplier(40, 80, true)).toBe(8);
    expect(payoutMultiplier(40, 201, true)).toBe(8);
    expect(payoutMultiplier(100, 201, true)).toBe(1);
    expect(payoutMultiplier(140, 90, true)).toBe(1);
  });

  it("counts a perfect sweep only from the 11 regulation first-outs", () => {
    const john = Array.from({ length: 11 }, () => "john");
    expect(isPerfectSweep(john)).toEqual({ sweep: true, sweeperId: "john" });
    expect(isPerfectSweep([...john, "dad"])).toEqual({ sweep: true, sweeperId: "john" });
    expect(isPerfectSweep(["john", "john"])).toEqual({ sweep: false, sweeperId: null });
    expect(isPerfectSweep([...john.slice(0, 10), "dad"])).toEqual({ sweep: false, sweeperId: null });
    expect(isPerfectSweep([...john.slice(0, 10), null])).toEqual({ sweep: false, sweeperId: null });
  });

  it("settles losers paying the winner at stake times multiplier", () => {
    const firstOuts = Array.from({ length: 11 }, () => "ada");
    const settlement = settleWager({
      players: [
        { id: "ada", name: "Ada", score: 40 },
        { id: "ben", name: "Ben", score: 120 },
        { id: "cal", name: "Cal", score: 220 },
      ],
      winnerId: "ada",
      stake: 10,
      stakePath: [5, 10],
      firstOutIds: firstOuts,
      suddenDeathHands: 0,
    });
    expect(settlement?.winnerId).toBe("ada");
    expect(settlement?.perfectSweep).toBe(true);
    expect(settlement?.doubled).toBe(true);
    expect(settlement?.owes.map((row) => [row.name, row.amount, row.multiplier, row.starVictim])).toEqual([
      ["Ben", 80, 8, true],
      ["Cal", 80, 8, true],
    ]);
    expect(settlement?.winnerCollected).toBe(160);
    expect(wagerOweLine(settlement!.owes[0], "Ada")).toBe("Ben owes Ada $80 (8x — perfect sweep).");
    expect(formatStakePath([5, 10])).toBe("Started at $5, doubled to $10.");
    expect(formatPlayMoney(5)).toBe("$5");
  });

  it("pays only the current stake when the winner is at 100 or more", () => {
    const settlement = settleWager({
      players: [
        { id: "ada", name: "Ada", score: 110 },
        { id: "ben", name: "Ben", score: 250 },
      ],
      winnerId: "ada",
      stake: 5,
      stakePath: [5],
      firstOutIds: Array.from({ length: 11 }, () => "ada"),
      suddenDeathHands: 1,
    });
    expect(settlement?.owes[0]).toMatchObject({ amount: 5, multiplier: 1, starVictim: true });
    expect(settlement?.suddenDeathHands).toBe(1);
    expect(formatStakePath([5])).toBeNull();
    expect(wagerOweLine(settlement!.owes[0], "Ada")).toBe("Ben owes Ada $5.");
  });
});
