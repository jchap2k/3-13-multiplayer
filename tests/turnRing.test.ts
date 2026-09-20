import { describe, expect, it } from "vitest";
import { connectionNote, playerInitials, turnNeighbors } from "../client/lib/turnRing";
import type { PublicPlayer } from "../shared/types";

function p(id: string, name: string): PublicPlayer {
  return {
    id,
    name,
    isBot: false,
    botPlay: false,
    connected: true,
    seated: true,
    cardCount: 3,
    score: 0,
    roundScores: [],
    isYou: id === "you",
    avatar: "oak",
    seatIndex: 0,
    goldGlow: false,
    learning: false,
    learningMatch: false,
  };
}

describe("turn ring", () => {
  it("wraps previous / current / next around two seats", () => {
    const seats = [p("you", "Pat"), p("dad", "Dad")];
    expect(turnNeighbors(seats, "you")).toEqual({
      previous: seats[1],
      current: seats[0],
      next: seats[1],
    });
    expect(turnNeighbors(seats, "dad")).toEqual({
      previous: seats[0],
      current: seats[1],
      next: seats[0],
    });
  });

  it("names the neighbors for three or more seats", () => {
    const seats = [p("a", "Ada"), p("b", "Ben"), p("c", "Cam")];
    expect(turnNeighbors(seats, "b")).toEqual({
      previous: seats[0],
      current: seats[1],
      next: seats[2],
    });
    expect(turnNeighbors(seats, "a")).toEqual({
      previous: seats[2],
      current: seats[0],
      next: seats[1],
    });
    expect(turnNeighbors([], "a")).toEqual({
      previous: null,
      current: null,
      next: null,
    });
  });

  it("builds initials from the seat name", () => {
    expect(playerInitials("Pat")).toBe("PA");
    expect(playerInitials("Weekend Desk")).toBe("WD");
    expect(playerInitials("  ")).toBe("?");
  });

  it("marks a dropped human as away", () => {
    expect(connectionNote({ isBot: false, connected: false, botPlay: false })).toBe(" · away");
    expect(connectionNote({ isBot: false, connected: true, botPlay: false })).toBe("");
    expect(connectionNote({ isBot: true, connected: false, botPlay: false })).toBe("");
    expect(connectionNote({ isBot: false, connected: false, botPlay: true })).toBe("");
  });
});
