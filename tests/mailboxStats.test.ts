import { describe, expect, it } from "vitest";
import {
  applyMatchToMailbox,
  clearRecentMatchOutcomes,
  collectSitBoard,
  emptyMailboxStats,
  emptySitStatsView,
  filterSitBoard,
  formatSitDate,
  globalBestLine,
  globalWorstLine,
  normalizeHandle,
  recentMatchOutcomes,
  recordMatchOutcome,
  sitLeaderboard,
  sitRecordArchives,
  sitScoreLine,
  sitWorstArchives,
  toSitStatsView,
  type MatchRecord,
  type SitStatsView,
} from "../shared/mailboxStats";

function record(partial: Partial<MatchRecord> = {}): MatchRecord {
  return {
    roomCode: "KITE-7",
    endedAt: 1_725_724_800_000,
    wager: true,
    stake: 5,
    stakePath: [5],
    suddenDeathHands: 0,
    perfectSweep: true,
    sweeperId: "p1",
    winnerIds: ["p1"],
    players: [
      {
        seatId: "p1",
        mailboxId: "box-1",
        mailboxHandle: "john",
        name: "John",
        score: 32,
        won: true,
        firstOutCount: 11,
        wentOutRounds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        starVictim: false,
        chipDelta: 40,
      },
      {
        seatId: "p2",
        mailboxId: null,
        mailboxHandle: null,
        name: "Dad",
        score: 140,
        won: false,
        firstOutCount: 0,
        wentOutRounds: [],
        starVictim: true,
        chipDelta: -40,
      },
    ],
    ...partial,
  };
}

describe("mailbox stats hooks", () => {
  it("normalizes handles case-insensitively and drops blanks", () => {
    expect(normalizeHandle("  John  ")).toBe("john");
    expect(normalizeHandle("DAD")).toBe("dad");
    expect(normalizeHandle("")).toBeNull();
    expect(normalizeHandle("   ")).toBeNull();
    expect(normalizeHandle(null)).toBeNull();
  });

  it("applies W/L, best/worst-loss, dates, first-out stars, sweep, and chip ledger", () => {
    const match = record();
    const winner = applyMatchToMailbox(emptyMailboxStats({ mailboxId: "box-1", mailboxHandle: "John" }), match.players[0], match);
    expect(winner.mailboxHandle).toBe("john");
    expect(winner.displayName).toBe("John");
    expect(winner.wins).toBe(1);
    expect(winner.losses).toBe(0);
    expect(winner.bestScore).toBe(32);
    expect(winner.bestScoreAt).toBe(match.endedAt);
    expect(winner.worstScore).toBeNull();
    expect(winner.worstScoreAt).toBeNull();
    expect(winner.firstOutStars).toBe(11);
    expect(winner.perfectSweeps).toBe(1);
    expect(winner.chips).toBe(40);

    const later = applyMatchToMailbox(winner, { ...match.players[0], won: false, score: 90, firstOutCount: 2, chipDelta: -10 }, {
      ...match,
      endedAt: match.endedAt + 86_400_000,
      perfectSweep: false,
    });
    expect(later.wins).toBe(1);
    expect(later.losses).toBe(1);
    expect(later.bestScore).toBe(32);
    expect(later.bestScoreAt).toBe(match.endedAt);
    expect(later.worstScore).toBe(90);
    expect(later.worstScoreAt).toBe(match.endedAt + 86_400_000);
    expect(later.firstOutStars).toBe(13);
    expect(later.perfectSweeps).toBe(1);
    expect(later.chips).toBe(30);

    const loser = applyMatchToMailbox(emptyMailboxStats({ mailboxId: null, mailboxHandle: null }), match.players[1], match);
    expect(loser.displayName).toBe("Dad");
    expect(loser.wins).toBe(0);
    expect(loser.losses).toBe(1);
    expect(loser.bestScore).toBe(140);
    expect(loser.worstScore).toBe(140);
    expect(loser.worstScoreAt).toBe(match.endedAt);
    expect(loser.perfectSweeps).toBe(0);
    expect(loser.chips).toBe(-40);

    const view = toSitStatsView(later);
    expect(view.goldGlow).toBe(true);
    expect(view.worstLoss).toBe(90);
    expect(view.worstLossAt).toBe(later.worstScoreAt);
    expect(view.previousBest).toBeNull();
    expect(formatSitDate(later.bestScoreAt)).toBeTruthy();
    expect(formatSitDate(null)).toBeNull();
  });

  it("archives the previous best and worst when they are beaten", () => {
    const first = record({ endedAt: 100, perfectSweep: false });
    first.players[0] = { ...first.players[0], name: "Annie", mailboxHandle: "annie", score: 48, firstOutCount: 1, won: true };
    const afterWin = applyMatchToMailbox(emptyMailboxStats({ mailboxId: null, mailboxHandle: "annie" }, "Annie"), first.players[0], first);
    const better = applyMatchToMailbox(
      afterWin,
      { ...first.players[0], score: 42, won: true, firstOutCount: 0 },
      { ...first, endedAt: 200 },
    );
    expect(sitRecordArchives(afterWin, better)).toEqual([
      { displayName: "Annie", score: 48, recordedAt: 100 },
    ]);
    const afterLoss = applyMatchToMailbox(
      better,
      { ...first.players[0], score: 90, won: false, firstOutCount: 0 },
      { ...first, endedAt: 300, perfectSweep: false },
    );
    const worse = applyMatchToMailbox(
      afterLoss,
      { ...first.players[0], score: 187, won: false, firstOutCount: 0 },
      { ...first, endedAt: 400, perfectSweep: false },
    );
    expect(sitWorstArchives(afterLoss, worse)).toEqual([
      { displayName: "Annie", score: 90, recordedAt: 300 },
    ]);
  });

  it("counts a perfect sweep even when that player did not win", () => {
    const match = record({
      winnerIds: ["p2"],
      sweeperId: "p1",
      players: [
        {
          seatId: "p1",
          mailboxId: null,
          mailboxHandle: "john",
          name: "John",
          score: 88,
          won: false,
          firstOutCount: 11,
          wentOutRounds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
          starVictim: false,
          chipDelta: 0,
        },
      ],
    });
    const row = applyMatchToMailbox(emptyMailboxStats({ mailboxId: null, mailboxHandle: "john" }, "John"), match.players[0], match);
    expect(row.wins).toBe(0);
    expect(row.losses).toBe(1);
    expect(row.perfectSweeps).toBe(1);
    expect(toSitStatsView(row).goldGlow).toBe(true);
  });

  it("formats comedy score lines and immortal hall copy", () => {
    const at = Date.UTC(2026, 8, 7);
    const best = sitScoreLine("🥹", 42, "Annie", at);
    expect(best.startsWith("🥹 42 — Annie")).toBe(true);
    expect(sitScoreLine("😭", null, "Dad", null)).toBe("—");
    const fame = { handle: "annie", displayName: "Annie", score: 42, recordedAt: at };
    const shame = { handle: "dad", displayName: "Dad", score: 187, recordedAt: at };
    expect(globalBestLine(null)).toContain("finish a match");
    expect(globalBestLine(fame).startsWith("🥹 42 — Annie")).toBe(true);
    expect(globalWorstLine(null)).toContain("lose first");
    expect(globalWorstLine(shame).startsWith("😭 187 — Dad")).toBe(true);
  });

  it("sorts the sit-name board like a leaderboard and filters it", () => {
    const dad: SitStatsView = {
      ...emptySitStatsView("dad", "Dad"),
      wins: 0,
      losses: 2,
      bestScore: 88,
      worstLoss: 187,
      firstOutStars: 1,
    };
    const annie: SitStatsView = {
      ...emptySitStatsView("annie", "Annie"),
      wins: 2,
      losses: 0,
      bestScore: 42,
      firstOutStars: 3,
      goldGlow: true,
    };
    const seated = emptySitStatsView("cal", "Cal");
    expect(sitLeaderboard([dad, seated, annie]).map((row) => row.handle)).toEqual(["annie", "dad", "cal"]);
    const board = collectSitBoard([annie, dad], ["Cal", "Dad"]);
    expect(board.map((row) => row.handle)).toEqual(["annie", "dad", "cal"]);
    expect(filterSitBoard(board, "an").map((row) => row.handle)).toEqual(["annie"]);
    expect(filterSitBoard(board, "")).toHaveLength(3);
  });

  it("keeps an in-memory match log for later mailbox attach", () => {
    clearRecentMatchOutcomes();
    const match = record({ roomCode: "OAK-3" });
    recordMatchOutcome(match);
    expect(recentMatchOutcomes()[0]?.roomCode).toBe("OAK-3");
    expect(recentMatchOutcomes()[0]?.players[0]?.mailboxId).toBe("box-1");
    clearRecentMatchOutcomes();
  });
});
