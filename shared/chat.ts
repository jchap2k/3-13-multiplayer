export const CHAT_MAX_LEN = 240;
export const CHAT_HISTORY = 80;
/** Visible lines in the top-of-table chat bar. */
export const TABLE_CHAT_PEEK = 2;

export function recentChat<T>(messages: readonly T[], limit: number): T[] {
  if (limit <= 0) return [];
  if (messages.length <= limit) return [...messages];
  return messages.slice(-limit);
}

export interface ChatMessage {
  id: string;
  playerId: string;
  name: string;
  text: string;
  at: number;
}

export function sanitizeChat(raw: string): string | null {
  let text = raw.replace(/<[^>]*>/g, "");
  text = text.replace(/[\u0000-\u001F\u007F]/g, "");
  text = text.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length > CHAT_MAX_LEN) text = text.slice(0, CHAT_MAX_LEN);
  return text;
}

export function formatChatTime(at: number): string {
  try {
    return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function allowChatBurst(recent: number[], now = Date.now(), windowMs = 8000, max = 8): number[] | null {
  const kept = recent.filter((stamp) => now - stamp < windowMs);
  if (kept.length >= max) return null;
  return [...kept, now];
}
