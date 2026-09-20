import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PLAYER_KEY = "tt-player-id";

export function getPlayerId(): string {
  const existing = localStorage.getItem(PLAYER_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(PLAYER_KEY, id);
  return id;
}

export function roomFromUrl(): string | null {
  const raw = new URLSearchParams(window.location.search).get("room");
  return raw ? raw.trim().toUpperCase() : null;
}

export function writeRoomToUrl(code: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", code);
  window.history.replaceState({}, "", url);
}

const ROOM_EPOCH_KEY = "tt-room-epoch";

export function readRoomEpoch(): { code: string; createdAt: number } | null {
  try {
    const raw = sessionStorage.getItem(ROOM_EPOCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code?: string; createdAt?: number };
    if (!parsed.code || typeof parsed.createdAt !== "number") return null;
    return { code: parsed.code, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

export function writeRoomEpoch(code: string, createdAt: number) {
  sessionStorage.setItem(ROOM_EPOCH_KEY, JSON.stringify({ code, createdAt }));
}
