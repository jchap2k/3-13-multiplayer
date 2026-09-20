import { beforeEach, describe, expect, it } from "vitest";
import {
  addHumanSeat,
  completeHandForTest,
  createRoom,
  endGame,
  nextRound,
  rematch,
  setWagerRules,
  setWagerStake,
  startGame,
  toClientView,
} from "../server/room";
import { resetSitStatsForTest } from "../server/sitStats";
import { clearRecentMatchOutcomes, recentMatchOutcomes } from "../shared/mailboxStats";

function seatedRoom(code: string) {
  const room = createRoom(code);
  addHumanSeat(room, "john", "John");
  addHumanSeat(room, "dad", "Dad");
  addHumanSeat(room, "annie", "Annie");
  return room;
}

describe("wager house rule", () => {
  beforeEach(() => {
    resetSitStatsForTest();
  });

  it("defaults off and locks after start", () => {
    const room = seatedRoom("WAGER-1");
    expect(room.wagerRules).toBe(false);
    expect(toClientView(room, "john").wagerRules).toBe(false);
    expect(toClientView(room, "john").players[0]?.mailboxId).toBeNull();
    expect(setWagerRules(room, true)).toBeNull();
    expect(room.wagerRules).toBe(true);
    expect(startGame(room, "john")).toBeNull();
    expect(room.wagerStake).toBe(5);
    expect(room.wagerStakePath).toEqual([5]);
    expect(setWagerRules(room, false)).toBe("House rules are locked after the start.");
    expect(room.wagerRules).toBe(true);
    expect(setWagerStake(room, 20)).toBe("House rules are locked after the start.");
  });

  it("lets the host set the starting stake in the lobby and keeps it on rematch", () => {
    const room = seatedRoom("STAKE-20");
    expect(setWagerStake(room, 20)).toBeNull();
    expect(setWagerRules(room, true)).toBeNull();
    expect(room.wagerStakeStart).toBe(20);
    expect(toClientView(room, "john").wagerStake).toBe(20);
    expect(startGame(room, "john")).toBeNull();
    expect(room.wagerStake).toBe(20);
    room.round = 11;
    completeHandForTest(room, "john", { dad: 8, annie: 12 });
    expect(rematch(room)).toBeNull();
    expect(room.wagerStake).toBe(20);
    expect(room.wagerStakeStart).toBe(20);
    expect(setWagerStake(room, 1)).toBeNull();
    expect(room.wagerStake).toBe(1);
  });

  it("doubles the stake when every running total is tied", () => {
    const room = seatedRoom("TIE-5");
    setWagerRules(room, true);
    startGame(room, "john");
    completeHandForTest(room, "john", { dad: 0, annie: 0 });
    expect(room.phase).toBe("round_end");
    expect(room.wagerStake).toBe(10);
    expect(room.wagerStakePath).toEqual([5, 10]);
    expect(room.message).toMatch(/Stake doubles to \$10/);
    expect(room.firstOutIds).toEqual(["john"]);
  });

  it("plays sudden death from deal 3 when wager is on and first place is tied", () => {
    const room = seatedRoom("SUDDEN-1");
    setWagerRules(room, true);
    startGame(room, "john");
    room.round = 11;
    completeHandForTest(room, "john", { dad: 0, annie: 0 });
    expect(room.phase).toBe("round_end");
    expect(room.wagerSuddenDeath).toBe(true);
    expect(room.wagerStake).toBe(10);
    expect(room.winnerIds).toEqual([]);
    expect(room.wagerSettlement).toBeNull();
    expect(room.message).toMatch(/Sudden death from deal 3/);
    expect(nextRound(room)).toBeNull();
    expect(room.round).toBe(1);
    expect(room.wagerSuddenDeathHands).toBe(1);
    expect(room.phase).toBe("playing");
    completeHandForTest(room, "john", { dad: 4, annie: 6 });
    expect(room.phase).toBe("match_end");
    expect(room.winnerIds).toEqual(["john"]);
    expect(room.wagerSettlement?.winnerId).toBe("john");
    expect(room.wagerSettlement?.suddenDeathHands).toBe(1);
    expect(room.firstOutIds).toEqual(["john"]);
  });

  it("settles match-local owes and records a mailbox-ready outcome", () => {
    clearRecentMatchOutcomes();
    const room = seatedRoom("PAY-1");
    setWagerRules(room, true);
    startGame(room, "john");
    room.round = 11;
    room.firstOutIds = Array.from({ length: 10 }, () => "john");
    completeHandForTest(room, "john", { dad: 120, annie: 40 });
    expect(room.phase).toBe("match_end");
    expect(room.wagerSettlement?.winnerName).toBe("John");
    expect(room.wagerSettlement?.owes.find((row) => row.playerId === "dad")?.multiplier).toBe(8);
    expect(room.wagerSettlement?.owes.find((row) => row.playerId === "dad")?.amount).toBe(40);
    const view = toClientView(room, "john");
    expect(view.wagerSettlement?.winnerCollected).toBe(80);
    const logged = recentMatchOutcomes()[0];
    expect(logged?.wager).toBe(true);
    expect(logged?.players.every((player) => player.mailboxId === null)).toBe(true);
    expect(logged?.players.find((player) => player.seatId === "john")?.mailboxHandle).toBe("john");
    expect(logged?.players.find((player) => player.seatId === "john")?.chipDelta).toBe(80);
    expect(logged?.players.find((player) => player.seatId === "dad")?.starVictim).toBe(true);
  });

  it("keeps shared winners when wager is off and does not settle mid-match end", () => {
    const room = seatedRoom("SHARE-1");
    startGame(room, "john");
    room.round = 11;
    completeHandForTest(room, "john", { dad: 0, annie: 0 });
    expect(room.phase).toBe("match_end");
    expect(room.winnerIds.sort()).toEqual(["annie", "dad", "john"]);
    expect(room.wagerSettlement).toBeNull();

    const live = seatedRoom("END-W");
    setWagerRules(live, true);
    startGame(live, "john");
    completeHandForTest(live, "john", { dad: 6, annie: 9 });
    expect(endGame(live, "john")).toBeNull();
    expect(live.phase).toBe("lobby");
    expect(live.wagerRules).toBe(true);
    expect(live.wagerSettlement).toBeNull();
    expect(live.wagerStake).toBe(5);
    expect(live.firstOutIds).toEqual([]);
  });

  it("keeps the wager toggle on rematch and resets the chip runtime", () => {
    const room = seatedRoom("REMATCH-W");
    setWagerRules(room, true);
    startGame(room, "john");
    room.round = 11;
    completeHandForTest(room, "john", { dad: 20, annie: 30 });
    expect(room.wagerSettlement).not.toBeNull();
    expect(rematch(room)).toBeNull();
    expect(room.wagerRules).toBe(true);
    expect(room.wagerSettlement).toBeNull();
    expect(room.wagerStake).toBe(5);
    expect(room.wagerSuddenDeath).toBe(false);
    expect(toClientView(room, "john").wagerRules).toBe(true);
  });
});
