import { describe, expect, it } from "vitest";
import {
  clearTableSession,
  readTableSession,
  sessionEpoch,
  TABLE_SESSION_KEY,
  writeTableSession,
} from "../client/lib/session";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe("table session", () => {
  it("persists room code, player id, and createdAt for a seat claim", () => {
    const store = new MemoryStorage();
    expect(readTableSession(store)).toBeNull();
    writeTableSession({ roomCode: "kite-7", playerId: "p1", createdAt: 42 }, store);
    expect(store.getItem(TABLE_SESSION_KEY)).toContain("p1");
    expect(readTableSession(store)).toEqual({
      roomCode: "KITE-7",
      playerId: "p1",
      createdAt: 42,
    });
    expect(sessionEpoch(readTableSession(store))).toEqual({ code: "KITE-7", createdAt: 42 });
    clearTableSession(store);
    expect(readTableSession(store)).toBeNull();
  });

  it("ignores a broken blob", () => {
    const store = new MemoryStorage();
    store.setItem(TABLE_SESSION_KEY, "{not json");
    expect(readTableSession(store)).toBeNull();
    store.setItem(TABLE_SESSION_KEY, JSON.stringify({ roomCode: "KITE-7" }));
    expect(readTableSession(store)).toBeNull();
  });
});