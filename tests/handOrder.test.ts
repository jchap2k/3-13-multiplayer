import { describe, expect, it } from "vitest";
import {
  arrayMove,
  groupWilds,
  mergeHandOrder,
  orderedHand,
  sortByMelds,
  sortByRank,
  sortBySuit,
} from "../client/lib/handOrder";
import { shouldClearHandSelection } from "../client/lib/handSelect";
import type { Card } from "../shared/types";

function c(id: string, rank: number, suit: Card["suit"]): Card {
  return { id, rank: rank as Card["rank"], suit };
}

describe("hand order", () => {
  it("keeps a local order and appends newly drawn cards", () => {
    const first = [c("9h", 9, "H"), c("3s", 3, "S"), c("9c", 9, "C")];
    const order = mergeHandOrder([], first);
    expect(order).toEqual(["9h", "3s", "9c"]);

    const rearranged = ["3s", "9c", "9h"];
    const afterDraw = mergeHandOrder(rearranged, [...first, c("kd", 13, "D")]);
    expect(afterDraw).toEqual(["3s", "9c", "9h", "kd"]);
  });

  it("drops discarded cards without reshuffling the rest", () => {
    const next = mergeHandOrder(["3s", "9c", "9h", "kd"], [
      c("3s", 3, "S"),
      c("9h", 9, "H"),
      c("kd", 13, "D"),
    ]);
    expect(next).toEqual(["3s", "9h", "kd"]);
  });

  it("moves a card and sorts helpers", () => {
    const hand = [c("9h", 9, "H"), c("3s", 3, "S"), c("ad", 1, "D"), c("3d", 3, "D")];
    expect(arrayMove(["9h", "3s", "ad"], 0, 2)).toEqual(["3s", "ad", "9h"]);
    expect(sortByRank(hand)).toEqual(["ad", "3s", "3d", "9h"]);
    expect(sortBySuit(hand)).toEqual(["3s", "9h", "ad", "3d"]);
    expect(groupWilds(orderedHand(hand, ["9h", "3s", "ad", "3d"]), 3)).toEqual([
      "3s",
      "3d",
      "9h",
      "ad",
    ]);
  });

  it("clusters legal runs and 3+ sets, and leaves pairs after", () => {
    const hand = [
      c("kh", 13, "H"),
      c("2c", 2, "C"),
      c("qh", 12, "H"),
      c("9s", 9, "S"),
      c("ah", 1, "H"),
      c("9h", 9, "H"),
      c("9d", 9, "D"),
      c("2s", 2, "S"),
    ];
    const order = sortByMelds(hand, 3);
    const qkaAt = order.findIndex((id) => id === "qh");
    expect(order.slice(qkaAt, qkaAt + 3)).toEqual(["qh", "kh", "ah"]);
    const nineAt = order.findIndex((id) => id === "9s");
    expect(new Set(order.slice(nineAt, nineAt + 3))).toEqual(new Set(["9s", "9h", "9d"]));
    expect(order.slice(-2)).toEqual(["2s", "2c"]);
  });

  it("uses A-2-3 as a low run and does not wrap K-A-2", () => {
    expect(
      sortByMelds([c("3d", 3, "D"), c("ad", 1, "D"), c("2d", 2, "D"), c("ks", 13, "S")], 8),
    ).toEqual(["ad", "2d", "3d", "ks"]);
    const wrap = sortByMelds(
      [c("ks", 13, "S"), c("as", 1, "S"), c("2s", 2, "S"), c("4h", 4, "H")],
      8,
    );
    expect(wrap.slice(0, 3)).not.toEqual(["ks", "as", "2s"]);
    expect(wrap.slice(0, 3)).not.toEqual(["as", "ks", "2s"]);
    expect(new Set(wrap)).toEqual(new Set(["ks", "as", "2s", "4h"]));
  });

  it("puts a wild into a set when the table already treats that rank as wild", () => {
    const hand = [c("7s", 7, "S"), c("7h", 7, "H"), c("3d", 3, "D"), c("jc", 11, "C")];
    const order = sortByMelds(hand, 3);
    expect(new Set(order.slice(0, 3))).toEqual(new Set(["7s", "7h", "3d"]));
    expect(order[3]).toBe("jc");
  });
});

describe("hand selection", () => {
  const args = {
    selected: "9h",
    yourTurn: true,
    turnPhase: "discard" as const,
    handIds: ["9h", "3s"],
  };

  it("clears when the turn ends, draw starts, or the card left the hand", () => {
    expect(shouldClearHandSelection(args)).toBe(false);
    expect(shouldClearHandSelection({ ...args, yourTurn: false })).toBe(true);
    expect(shouldClearHandSelection({ ...args, turnPhase: "draw" })).toBe(true);
    expect(shouldClearHandSelection({ ...args, handIds: ["3s"] })).toBe(true);
    expect(shouldClearHandSelection({ ...args, selected: null })).toBe(false);
    expect(shouldClearHandSelection({ ...args, idleAutoMove: true })).toBe(true);
    expect(
      shouldClearHandSelection({
        ...args,
        previousPlayerId: "p1",
        currentPlayerId: "p2",
      }),
    ).toBe(true);
  });
});
