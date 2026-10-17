import { describe, expect, it } from "vitest";
import {
  AUTO_NEXT_MS,
  countdownProgress,
  lastRoundPoints,
  liveScoreCompact,
  nextDealBrief,
  placeLabel,
  rankStandings,
  roundTableCompact,
  scoreRoundLabel,
  scoredRoundCount,
  secondsUntil,
} from "../shared/scoreboard";
import {
  addBotSeat,
  addHumanSeat,
  createRoom,
  maybeAct,
  nextRound,
  playBotTurn,
  rematch,
  endGame,
  startGame,
  toClientView,
} from "../server/room";

describe("standings", () => {
  it("ranks lowest total first and shares place on a tie", () => {
    const rows = rankStandings([
      { id: "b", name: "Ben", isBot: false, isYou: false, score: 40, roundScores: [20, 20], goldGlow: false },
      { id: "a", name: "Ada", isBot: false, isYou: true, score: 12, roundScores: [0, 12], goldGlow: false },
      { id: "c", name: "Cal", isBot: true, isYou: false, score: 40, roundScores: [15, 25], goldGlow: false },
    ]);
    expect(rows.map((row) => row.name)).toEqual(["Ada", "Ben", "Cal"]);
    expect(rows.map((row) => row.place)).toEqual([1, 2, 2]);
    expect(placeLabel(1)).toBe("1st");
    expect(placeLabel(2)).toBe("2nd");
    expect(placeLabel(3)).toBe("3rd");
    expect(placeLabel(11)).toBe("11th");
  });

  it("ranks a 14 between 0 and a pair of 18s as 2nd, sharing 3rd on the tie", () => {
    const seat = (id: string, name: string, score: number) => ({
      id,
      name,
      isBot: false,
      isYou: false,
      score,
      roundScores: [score],
      goldGlow: false,
    });
    const rows = rankStandings([
      seat("a", "CoS", 0),
      seat("b", "Duty Officer", 14),
      seat("c", "Nova", 18),
      seat("d", "Wire Editor", 18),
      seat("e", "Piper", 20),
      seat("f", "Nash", 23),
    ]);
    expect(rows.find((row) => row.name === "Duty Officer")?.place).toBe(2);
    expect(placeLabel(2)).toBe("2nd");
    expect(rows.map((row) => row.place)).toEqual([1, 2, 3, 3, 5, 6]);
    expect(rows.map((row) => row.score)).toEqual([0, 14, 18, 18, 20, 23]);
  });

  it("describes the next deal apart from the countdown", () => {
    expect(nextDealBrief(1)).toEqual({ round: 2, wildRank: 4, wild: "4s", cardsEach: 4 });
    expect(nextDealBrief(10)).toMatchObject({ round: 11, cardsEach: 13 });
    expect(nextDealBrief(11)).toBeNull();
    expect(countdownProgress(12, 12)).toBe(0);
    expect(countdownProgress(7, 12)).toBeCloseTo(5 / 12);
    expect(countdownProgress(0, 12)).toBe(1);
    expect(countdownProgress(null, 12)).toBe(1);
  });

  it("compacts the live strip at 5 players and freezes wide round columns", () => {
    expect(liveScoreCompact(4)).toBe(false);
    expect(liveScoreCompact(5)).toBe(true);
    expect(liveScoreCompact(8)).toBe(true);
    expect(roundTableCompact(4, 3)).toBe(false);
    expect(roundTableCompact(6, 1)).toBe(true);
    expect(roundTableCompact(2, 9)).toBe(true);
    expect(roundTableCompact(8, 11)).toBe(true);
  });

  it("labels score columns by the wild rank for that round", () => {
    expect(scoreRoundLabel(1)).toBe("3");
    expect(scoreRoundLabel(2)).toBe("4");
    expect(scoreRoundLabel(11)).toBe("K");
    expect(scoredRoundCount([{ roundScores: [0] }, { roundScores: [12] }], 1)).toBe(1);
    expect(lastRoundPoints({ roundScores: [0, 15] })).toBe(15);
  });

  it("counts down to auto-next and does not go negative", () => {
    expect(AUTO_NEXT_MS).toBe(12_000);
    expect(secondsUntil(1_000, 0)).toBe(1);
    expect(secondsUntil(Date.now() - 5_000)).toBe(0);
    expect(secondsUntil(null)).toBeNull();
  });
});

describe("round-end pause", () => {
  it("holds scores before auto-advancing, and Next round can skip the wait", () => {
    const room = createRoom("BOARD-1");
    addBotSeat(room, "Alex");
    addBotSeat(room, "Sam");
    startGame(room);
    let steps = 0;
    while (room.phase === "playing" && steps < 800) {
      const seat = room.seats.find((item) => item.id === room.currentSeatId);
      if (!seat) break;
      playBotTurn(room, seat);
      steps += 1;
    }
    expect(room.phase).toBe("round_end");
    const view = toClientView(room, room.seats[0].id);
    expect(view.autoNextAt).toBe(room.autoNextAt);
    expect(view.wentOutId).toBe(room.wentOutId);
    expect(view.revealed?.length).toBe(2);
    expect(room.autoNextAt).toBeGreaterThan(Date.now() + 10_000);
    expect(maybeAct(room, Date.now() + 1_000)).toBe(false);
    expect(room.phase).toBe("round_end");
    expect(room.round).toBe(1);
    expect(nextRound(room)).toBeNull();
    expect(room.phase).toBe("playing");
    expect(room.round).toBe(2);
  });
});

describe("back to lobby", () => {
  it("returns every seat to the same-room lobby after the match", () => {
    const room = createRoom("BACK-1");
    addHumanSeat(room, "p1", "Ada");
    addHumanSeat(room, "p2", "Ben");
    startGame(room, "p1");
    room.phase = "match_end";
    room.winnerIds = ["p1"];
    expect(rematch(room)).toBeNull();
    expect(room.phase).toBe("lobby");
    expect(room.code).toBe("BACK-1");
    expect(room.seats.map((seat) => seat.id)).toEqual(["p1", "p2"]);
    const guest = toClientView(room, "p2");
    expect(guest.phase).toBe("lobby");
    expect(guest.isHost).toBe(false);
    expect(guest.roomCode).toBe("BACK-1");
  });

  it("lets only the host end a live match back to the same lobby", () => {
    const room = createRoom("END-1");
    addHumanSeat(room, "p1", "Ada");
    addHumanSeat(room, "p2", "Ben");
    startGame(room, "p1");
    expect(room.phase).toBe("playing");
    expect(endGame(room, "p2")).toBe("Only the host can end the game.");
    expect(room.phase).toBe("playing");
    expect(endGame(room, "p1")).toBeNull();
    expect(room.phase).toBe("lobby");
    expect(room.code).toBe("END-1");
    expect(room.seats.map((seat) => seat.id)).toEqual(["p1", "p2"]);
    expect(room.message).toMatch(/Host ended the game/);
    expect(endGame(room, "p1")).toBe("The match has not started.");
  });
});
