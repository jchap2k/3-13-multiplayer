import { describe, expect, it } from "vitest";
import {
  addHumanSeat,
  createRoom,
  discardCard,
  drawStock,
  startGame,
  takeDiscard,
  toClientView,
} from "../server/room";
import type { Card } from "../shared/types";

function c(id: string, rank: number, suit: Card["suit"]): Card {
  return { id, rank: rank as Card["rank"], suit };
}

function playingRoom() {
  const room = createRoom("SCOOP-1");
  addHumanSeat(room, "p1", "Ada");
  addHumanSeat(room, "p2", "Ben");
  startGame(room, "p1");
  room.currentSeatId = "p1";
  room.turnPhase = "draw";
  return room;
}

describe("discard-take ghost", () => {
  it("records the scooped upcard for every seat until the next discard lands", () => {
    const room = playingRoom();
    const top = c("up", 7, "H");
    room.discard = [c("under", 2, "S"), top];
    expect(room.scoopedDiscard).toBeNull();
    expect(takeDiscard(room, "p1")).toBeNull();
    expect(room.scoopedDiscard).toMatchObject({ id: "up", rank: 7, suit: "H" });
    expect(room.discard.at(-1)?.id).toBe("under");
    const view = toClientView(room, "p2");
    expect(view.scoopedDiscard).toEqual(room.scoopedDiscard);
    expect(view.discardTop?.id).toBe("under");

    room.seats[0].hand = [c("throw", 4, "D"), c("keep", 9, "S"), c("other", 2, "C"), top];
    room.turnPhase = "discard";
    expect(discardCard(room, "p1", "throw")).toBeNull();
    expect(room.scoopedDiscard).toBeNull();
    expect(toClientView(room, "p2").scoopedDiscard).toBeNull();
    expect(room.discard.at(-1)?.id).toBe("throw");
  });

  it("does not ghost a stock draw", () => {
    const room = playingRoom();
    room.discard = [c("up", 8, "C")];
    room.stock = [c("stock", 5, "H")];
    expect(drawStock(room, "p1")).toBeNull();
    expect(room.scoopedDiscard).toBeNull();
    expect(toClientView(room, "p1").scoopedDiscard).toBeNull();
  });
});
