import { Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CHAT_MAX_LEN, recentChat, TABLE_CHAT_PEEK, type ChatMessage } from "@shared/chat";
import { Button } from "./ui/button";

export function TableChatBar({
  messages,
  youId,
  youName,
  focusTick = 0,
  onSend,
}: {
  messages: ChatMessage[];
  youId: string;
  youName: string;
  focusTick?: number;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const visible = useMemo(() => recentChat(messages, TABLE_CHAT_PEEK), [messages]);
  const last = visible[visible.length - 1] ?? null;

  useEffect(() => {
    if (focusTick <= 0) return;
    inputRef.current?.focus();
  }, [focusTick]);

  function submit() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  const placeholder = last
    ? `${last.playerId === youId ? "You" : last.name}: ${last.text}`
    : youName
      ? `Table talk — Message as ${youName}`
      : "Table talk";

  return (
    <form
      className="mt-1 flex items-center gap-1.5 rounded-xl border border-amber-200/20 bg-black/35 px-2 py-1"
      data-table-chat-bar
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={CHAT_MAX_LEN}
        placeholder={placeholder}
        aria-label={youName ? `Table talk, message as ${youName}` : "Table talk"}
        className="h-8 min-w-0 flex-1 bg-transparent px-1 text-xs text-white placeholder:text-emerald-100/45 outline-none"
      />
      <Button type="submit" size="sm" className="h-8 px-2" disabled={!draft.trim()} aria-label="Send">
        <Send className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}
