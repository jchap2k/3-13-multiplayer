import type { RoomEpoch } from "@shared/resume";

export const TABLE_SESSION_KEY = "tt-table-session";

export type TableSession = {
  roomCode: string;
  playerId: string;
  createdAt: number;
};

function localStore(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readTableSession(store: Storage | null = localStore()): TableSession | null {
  if (!store) return null;
  try {
    const raw = store.getItem(TABLE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TableSession>;
    if (!parsed.roomCode || !parsed.playerId || typeof parsed.createdAt !== "number") return null;
    return {
      roomCode: String(parsed.roomCode).trim().toUpperCase(),
      playerId: String(parsed.playerId),
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

export function writeTableSession(session: TableSession, store: Storage | null = localStore()) {
  if (!store) return;
  store.setItem(TABLE_SESSION_KEY, JSON.stringify(session));
}

export function clearTableSession(store: Storage | null = localStore()) {
  store?.removeItem(TABLE_SESSION_KEY);
}

export function sessionEpoch(session: TableSession | null | undefined): RoomEpoch | null {
  if (!session) return null;
  return { code: session.roomCode, createdAt: session.createdAt };
}