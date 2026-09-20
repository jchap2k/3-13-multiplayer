import { beforeEach, describe, expect, it } from "vitest";
import {
  addBotSeat,
  addHumanSeat,
  completeHandForTest,
  createRoom,
  rematch,
  renameSeat,
  setSeatLearning,
  startGame,
  toClientView,
} from "../server/room";
import {
  forgetSitWorst,
  goldGlowFor,
  ingestHumanSitStats,
  listSitGlobal,
  listSitStats,
  resetSitStatsForTest,
  restoreSitWorst,
  wipeSitStats,
} from "../server/sitStats";
import type { MatchRecord } from "../shared/mailboxStats";

function match(partial: Partial<MatchRecord> & { players: MatchRecord["players"] }): MatchRecord {
  return {
    roomCode: "STAT-1",
    endedAt: Date.UTC(2026, 8, 7),
    wager: false,
    stake: 5,
    stakePath: [5],
    suddenDeathHands: 0,
    perfectSweep: false,
    sweeperId: null,
    winnerIds: [],
    ...partial,
  };
}

describe("sit-name stats", () => {
  beforeEach(() => {
    resetSitStatsForTest();
  });

  it("binds mailboxHandle to the seated name and skips bots", () => {
    const room = createRoom("SIT-1");
    expect(addHumanSeat(room, "p1", "Dad")).toBeNull();
    expect(addBotSeat(room, "Riley")).toBeNull();
    expect(room.seats[0]?.mailboxHandle).toBe("dad");
    expect(room.seats[1]?.mailboxHandle).toBeNull();
    renameSeat(room, "p1", "dad");
    expect(room.seats[0]?.name).toBe("dad");
    expect(room.seats[0]?.mailboxHandle).toBe("dad");
    const view = toClientView(room, "p1");
    expect(view.players[0]?.mailboxHandle).toBe("dad");
    expect(view.players[0]?.goldGlow).toBe(false);
    expect(view.players[1]?.goldGlow).toBe(false);
  });

  it("ingests humans only and treats Dad/dad as one row", () => {
    ingestHumanSitStats(
      match({
        endedAt: Date.UTC(2026, 8, 1),
        winnerIds: ["h1"],
        players: [
          {
            seatId: "h1",
            mailboxId: null,
            mailboxHandle: "Dad",
            name: "Dad",
            score: 40,
            won: true,
            firstOutCount: 3,
            wentOutRounds: [1, 2, 3],
            starVictim: false,
            chipDelta: 0,
          },
          {
            seatId: "bot-1",
            mailboxId: null,
            mailboxHandle: "riley",
            name: "Riley",
            score: 90,
            won: false,
            firstOutCount: 8,
            wentOutRounds: [],
            starVictim: false,
            chipDelta: 0,
          },
        ],
      }),
      ["bot-1"],
    );
    ingestHumanSitStats(
      match({
        endedAt: Date.UTC(2026, 8, 7),
        winnerIds: ["h2"],
        players: [
          {
            seatId: "h2",
            mailboxId: null,
            mailboxHandle: "dad",
            name: "dad",
            score: 22,
            won: false,
            firstOutCount: 1,
            wentOutRounds: [4],
            starVictim: false,
            chipDelta: 0,
          },
        ],
      }),
      [],
    );

    const rows = listSitStats();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.handle).toBe("dad");
    expect(rows[0]?.displayName).toBe("dad");
    expect(rows[0]?.wins).toBe(1);
    expect(rows[0]?.losses).toBe(1);
    expect(rows[0]?.bestScore).toBe(22);
    expect(rows[0]?.bestScoreAt).toBe(Date.UTC(2026, 8, 7));
    expect(rows[0]?.worstLoss).toBe(22);
    expect(rows[0]?.worstLossAt).toBe(Date.UTC(2026, 8, 7));
    expect(rows[0]?.firstOutStars).toBe(4);
    expect(rows[0]?.goldGlow).toBe(false);
    expect(goldGlowFor("DAD")).toBe(false);
  });

  it("glows only after a full 11-hand first-out sweep", () => {
    const room = createRoom("SWEEP-1");
    addHumanSeat(room, "john", "John");
    addHumanSeat(room, "dad", "Dad");
    setSeatLearning(room, "john", false);
    setSeatLearning(room, "dad", false);
    startGame(room, "john");
    room.round = 11;
    room.firstOutIds = Array.from({ length: 10 }, () => "john");
    completeHandForTest(room, "john", { dad: 40 });
    expect(room.phase).toBe("match_end");
    expect(goldGlowFor("John")).toBe(true);
    expect(goldGlowFor("Dad")).toBe(false);
    const view = toClientView(room, "john");
    expect(view.players.find((player) => player.id === "john")?.goldGlow).toBe(true);
    expect(view.players.find((player) => player.id === "dad")?.goldGlow).toBe(false);
    const john = view.sitStats.find((row) => row.handle === "john");
    expect(john?.wins).toBe(1);
    expect(john?.firstOutStars).toBe(11);
    expect(john?.perfectSweeps).toBe(1);
    expect(john?.goldGlow).toBe(true);
    expect(john?.bestScoreAt).toBeTruthy();
    expect(view.sitStats.find((row) => row.handle === "dad")?.worstLoss).toBeGreaterThan(0);
  });

  it("keeps the previous holder when a best or worst is beaten", () => {
    ingestHumanSitStats(
      match({
        endedAt: Date.UTC(2026, 8, 1),
        winnerIds: ["a"],
        players: [
          {
            seatId: "a",
            mailboxId: null,
            mailboxHandle: "annie",
            name: "Annie",
            score: 48,
            won: true,
            firstOutCount: 1,
            wentOutRounds: [1],
            starVictim: false,
            chipDelta: 0,
          },
        ],
      }),
      [],
    );
    ingestHumanSitStats(
      match({
        endedAt: Date.UTC(2026, 8, 7),
        winnerIds: ["a"],
        players: [
          {
            seatId: "a",
            mailboxId: null,
            mailboxHandle: "annie",
            name: "Annie",
            score: 42,
            won: true,
            firstOutCount: 0,
            wentOutRounds: [],
            starVictim: false,
            chipDelta: 0,
          },
        ],
      }),
      [],
    );
    const row = listSitStats().find((item) => item.handle === "annie");
    expect(row?.bestScore).toBe(42);
    expect(row?.previousBest).toEqual({
      displayName: "Annie",
      score: 48,
      recordedAt: Date.UTC(2026, 8, 1),
    });
  });

  it("lets the host forget a worst and wipe a name", () => {
    ingestHumanSitStats(
      match({
        endedAt: Date.UTC(2026, 8, 7),
        winnerIds: ["d"],
        players: [
          {
            seatId: "j",
            mailboxId: null,
            mailboxHandle: "dad",
            name: "Dad",
            score: 187,
            won: false,
            firstOutCount: 0,
            wentOutRounds: [],
            starVictim: false,
            chipDelta: 0,
          },
        ],
      }),
      [],
    );
    expect(listSitStats()[0]?.worstLoss).toBe(187);
    expect(forgetSitWorst("DAD")).toBeNull();
    expect(listSitStats()[0]?.worstLoss).toBeNull();
    expect(listSitStats()[0]?.previousWorst?.score).toBe(187);
    expect(restoreSitWorst("dad")).toBeNull();
    expect(listSitStats()[0]?.worstLoss).toBe(187);
    expect(wipeSitStats("Dad")).toBeNull();
    expect(listSitStats()).toHaveLength(0);
    expect(goldGlowFor("Dad")).toBe(false);
    expect(listSitGlobal().worst).toEqual({
      handle: "dad",
      displayName: "Dad",
      score: 187,
      recordedAt: Date.UTC(2026, 8, 7),
    });
  });

  it("keeps immortal hall-of-fame and hall-of-shame after personal forget and wipe", () => {
    ingestHumanSitStats(
      match({
        endedAt: Date.UTC(2026, 8, 1),
        winnerIds: ["a"],
        players: [
          {
            seatId: "a",
            mailboxId: null,
            mailboxHandle: "annie",
            name: "Annie",
            score: 42,
            won: true,
            firstOutCount: 2,
            wentOutRounds: [1, 2],
            starVictim: false,
            chipDelta: 0,
          },
          {
            seatId: "d",
            mailboxId: null,
            mailboxHandle: "dad",
            name: "Dad",
            score: 187,
            won: false,
            firstOutCount: 0,
            wentOutRounds: [],
            starVictim: false,
            chipDelta: 0,
          },
        ],
      }),
      [],
    );
    expect(listSitGlobal()).toEqual({
      best: { handle: "annie", displayName: "Annie", score: 42, recordedAt: Date.UTC(2026, 8, 1) },
      worst: { handle: "dad", displayName: "Dad", score: 187, recordedAt: Date.UTC(2026, 8, 1) },
    });
    expect(forgetSitWorst("dad")).toBeNull();
    expect(listSitStats().find((row) => row.handle === "dad")?.worstLoss).toBeNull();
    expect(wipeSitStats("annie")).toBeNull();
    expect(listSitStats().find((row) => row.handle === "annie")).toBeUndefined();
    expect(listSitGlobal()).toEqual({
      best: { handle: "annie", displayName: "Annie", score: 42, recordedAt: Date.UTC(2026, 8, 1) },
      worst: { handle: "dad", displayName: "Dad", score: 187, recordedAt: Date.UTC(2026, 8, 1) },
    });
    ingestHumanSitStats(
      match({
        endedAt: Date.UTC(2026, 8, 7),
        winnerIds: ["j"],
        players: [
          {
            seatId: "j",
            mailboxId: null,
            mailboxHandle: "john",
            name: "John",
            score: 30,
            won: true,
            firstOutCount: 1,
            wentOutRounds: [1],
            starVictim: false,
            chipDelta: 0,
          },
          {
            seatId: "c",
            mailboxId: null,
            mailboxHandle: "cal",
            name: "Cal",
            score: 200,
            won: false,
            firstOutCount: 0,
            wentOutRounds: [],
            starVictim: false,
            chipDelta: 0,
          },
        ],
      }),
      [],
    );
    expect(listSitGlobal()).toEqual({
      best: { handle: "john", displayName: "John", score: 30, recordedAt: Date.UTC(2026, 8, 7) },
      worst: { handle: "cal", displayName: "Cal", score: 200, recordedAt: Date.UTC(2026, 8, 7) },
    });
    const room = createRoom("HALL-1");
    addHumanSeat(room, "p1", "Ada");
    expect(toClientView(room, "p1").sitGlobal.best?.score).toBe(30);
    expect(toClientView(room, "p1").sitGlobal.worst?.score).toBe(200);
  });

  it("skips sit-name stats for learning seats and locks that at Start", () => {
    const room = createRoom("LEARN-1");
    addHumanSeat(room, "ada", "Ada");
    addHumanSeat(room, "ben", "Ben");
    expect(toClientView(room, "ada").players.find((player) => player.id === "ada")?.learning).toBe(false);
    setSeatLearning(room, "ada", true);
    setSeatLearning(room, "ben", false);
    expect(toClientView(room, "ada").players.find((player) => player.id === "ada")?.learning).toBe(true);
    startGame(room, "ada");
    expect(room.seats.find((seat) => seat.id === "ada")?.learningMatch).toBe(true);
    setSeatLearning(room, "ada", false);
    expect(room.seats.find((seat) => seat.id === "ada")?.learning).toBe(false);
    expect(room.seats.find((seat) => seat.id === "ada")?.learningMatch).toBe(true);
    room.round = 11;
    room.firstOutIds = Array.from({ length: 10 }, () => "ada");
    completeHandForTest(room, "ada", { ben: 50 });
    expect(room.phase).toBe("match_end");
    expect(listSitStats().find((row) => row.handle === "ada")).toBeUndefined();
    expect(listSitStats().find((row) => row.handle === "ben")?.losses).toBe(1);
    expect(goldGlowFor("Ada")).toBe(false);
    expect(toClientView(room, "ada").sitGlobal.best?.handle).toBe("ben");
    expect(toClientView(room, "ada").sitGlobal.best?.score).toBe(50);

    rematch(room);
    setSeatLearning(room, "ada", false);
    startGame(room, "ada");
    room.round = 11;
    room.firstOutIds = Array.from({ length: 10 }, () => "ada");
    completeHandForTest(room, "ada", { ben: 40 });
    expect(listSitStats().find((row) => row.handle === "ada")?.wins).toBe(1);
    expect(goldGlowFor("Ada")).toBe(true);
  });
});
