import { randomUUID } from "node:crypto";
import { allowChatBurst, CHAT_HISTORY, sanitizeChat, type ChatMessage } from "../shared/chat.js";

const logs = new Map<string, ChatMessage[]>();
const bursts = new Map<string, number[]>();

export function roomChat(code: string): ChatMessage[] {
  return logs.get(code) ?? [];
}

export function clearRoomChat(code: string) {
  logs.delete(code);
}

export function postChat(
  roomCode: string,
  playerId: string,
  name: string,
  raw: string,
): { message?: ChatMessage; error?: string } {
  const text = sanitizeChat(raw);
  if (!text) return { error: "Empty message." };
  const nextBurst = allowChatBurst(bursts.get(playerId) ?? []);
  if (!nextBurst) return { error: "Easy — a few messages at a time." };
  bursts.set(playerId, nextBurst);
  const message: ChatMessage = {
    id: randomUUID(),
    playerId,
    name: name.trim().slice(0, 24) || "Guest",
    text,
    at: Date.now(),
  };
  const list = [...(logs.get(roomCode) ?? []), message].slice(-CHAT_HISTORY);
  logs.set(roomCode, list);
  return { message };
}
