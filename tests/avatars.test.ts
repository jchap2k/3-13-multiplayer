import { describe, expect, it } from "vitest";
import {
  AVATAR_IDS,
  claimIfFree,
  normalizeAvatar,
  seatAccent,
  unusedAvatar,
} from "../shared/avatars";
import {
  addBotSeat,
  addHumanSeat,
  assignMissingAvatars,
  createRoom,
  removeSeat,
  setSeatAvatar,
  startGame,
  toClientView,
} from "../server/room";
import { publicRoomUrl } from "../client/components/CopyRoomLink";

describe("stock avatars and seat colors", () => {
  it("normalizes unknown ids and hands out unused faces", () => {
    expect(normalizeAvatar("fox")).toBe("fox");
    expect(normalizeAvatar("nope")).toBe("oak");
    expect(unusedAvatar(["oak", "fox"])).toBe("kite");
    expect(unusedAvatar(AVATAR_IDS)).toBeNull();
    expect(AVATAR_IDS).toContain("cat");
    expect(AVATAR_IDS).toContain("tiger");
    expect(unusedAvatar(["oak", "fox", "kite", "wolf", "fern", "hawk", "river", "lantern", "cat"])).toBe(
      "tiger",
    );
    expect(claimIfFree("cat", ["oak"])).toBe("cat");
    expect(claimIfFree("tiger", ["cat"])).toBe("tiger");
    expect(claimIfFree("tiger", ["tiger"])).toBeNull();
    expect(claimIfFree("fox", ["oak"])).toBe("fox");
    expect(claimIfFree("fox", ["fox"])).toBeNull();
    expect(seatAccent(0).ring).toMatch(/^#/);
    expect(seatAccent(8).ring).toBe(seatAccent(0).ring);
  });

  it("stores a picked avatar, keeps uniqueness, and frees it on change or leave", () => {
    const room = createRoom("FACE-1");
    expect(addHumanSeat(room, "john", "John", "fox")).toBeNull();
    expect(addHumanSeat(room, "dad", "Dad", "fox")).toBeNull();
    expect(addBotSeat(room, "Riley")).toBeNull();
    const lobby = toClientView(room, "john");
    expect(lobby.players.map((player) => player.avatar)).toEqual(["fox", null, null]);
    expect(lobby.players.map((player) => player.seatIndex)).toEqual([0, 1, 2]);
    expect(setSeatAvatar(room, "dad", "fox")).toBe("That avatar is already taken.");
    expect(room.seats.find((seat) => seat.id === "dad")?.avatar).toBeNull();
    expect(setSeatAvatar(room, "john", "hawk")).toBeNull();
    expect(toClientView(room, "john").players[0]?.avatar).toBe("hawk");
    expect(setSeatAvatar(room, "dad", "fox")).toBeNull();
    expect(room.seats.find((seat) => seat.id === "dad")?.avatar).toBe("fox");
    expect(removeSeat(room, "dad")).toBeNull();
    expect(setSeatAvatar(room, "john", "fox")).toBeNull();
    expect(setSeatAvatar(room, "john", "cat")).toBeNull();
    expect(toClientView(room, "john").players[0]?.avatar).toBe("cat");
    expect(setSeatAvatar(room, "john", "cat")).toBeNull();
    expect(addHumanSeat(room, "ada", "Ada", "tiger")).toBeNull();
    expect(room.seats.find((seat) => seat.id === "john")?.avatar).toBe("cat");
    expect(room.seats.find((seat) => seat.id === "ada")?.avatar).toBe("tiger");
    expect(setSeatAvatar(room, "ada", "cat")).toBe("That avatar is already taken.");
  });

  it("assigns leftover tokens at Start so every seat is unique", () => {
    const room = createRoom("TOKEN-1");
    expect(addHumanSeat(room, "john", "John")).toBeNull();
    expect(addHumanSeat(room, "dad", "Dad", "lantern")).toBeNull();
    expect(addBotSeat(room, "Riley")).toBeNull();
    expect(room.seats.map((seat) => seat.avatar)).toEqual([null, "lantern", null]);
    assignMissingAvatars(room);
    const faces = room.seats.map((seat) => seat.avatar);
    expect(faces[1]).toBe("lantern");
    expect(new Set(faces).size).toBe(3);
    expect(faces.every(Boolean)).toBe(true);
    expect(startGame(room, "john")).toBeNull();
    const after = room.seats.map((seat) => seat.avatar);
    expect(new Set(after).size).toBe(3);
    expect(after.every(Boolean)).toBe(true);
  });
});

describe("copy room link", () => {
  it("builds the full share URL", () => {
    expect(publicRoomUrl("KITE-7", "https://three-thirteen.fly.dev")).toBe(
      "https://three-thirteen.fly.dev/?room=KITE-7",
    );
  });
});
