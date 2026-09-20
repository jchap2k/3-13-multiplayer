import { isValidRoomCode, normalizeRoomCode } from "./roomCode.js";

export const ROOM_LOST_HINT =
  "Server restarted or this table was wiped. Scores from the last hand are gone. Sit again here, or tap New code.";

export const RECONNECTING_HINT = "Reconnecting…";
export const BACK_HINT = "You're back — same seat.";

export type RoomEpoch = { code: string; createdAt: number };

export function roomWasWiped(prev: RoomEpoch | null | undefined, next: RoomEpoch): boolean {
  if (!prev) return false;
  return prev.code === next.code && prev.createdAt !== next.createdAt;
}

/** URL wins when it is a real WORD-NN code. Otherwise reuse the last seated table. */
export function preferredRoomCode(
  urlCode: string | null | undefined,
  sessionCode: string | null | undefined,
): string | null {
  const url = urlCode ? normalizeRoomCode(urlCode) : "";
  if (url && isValidRoomCode(url)) return url;
  const session = sessionCode ? normalizeRoomCode(sessionCode) : "";
  if (session && isValidRoomCode(session)) return session;
  return null;
}

export function reconnectDelayMs(attempt: number): number {
  const n = Math.max(0, Math.floor(attempt));
  return Math.min(800 * 2 ** Math.min(n, 3), 5000);
}
