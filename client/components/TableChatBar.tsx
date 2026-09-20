import { Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CHAT_MAX_LEN, formatChatTime, recentChat, TABLE_CHAT_PEEK, type ChatMessage } from "@shared/chat";
import { cn } from "../lib/utils";
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
  const scroller = useRef<HTMLDivElement | null>(null);
  const visible = useMemo(() => recentChat(messages, TABLE_CHAT_PEEK), [messages]);

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [visible]);

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

  return (
    <div className="mt-2 rounded-2xl border border-amber-200/20 bg-black/35 px-2 py-1.5" data-table-chat-bar>
      <div ref={scroller} className="max-h-[2.65rem] space-y-0.5 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="truncate text-[11px] leading-snug text-emerald-100/50">
            Table talk — two lines stay here. Hand and discard stay clear.
          </p>
        ) : (
          visible.map((msg) => {
            const mine = msg.playerId === youId;
            return (
              <p key={msg.id} className="truncate text-[11px] leading-snug text-emerald-50">
                <span className={cn("font-semibold", mine ? "text-amber-100" : "text-amber-100/70")}>
                  {mine ? "You" : msg.name}
                </span>
                <span className="text-emerald-100/40"> · {formatChatTime(msg.at)} · </span>
                {msg.text}
              </p>
            );
          })
        )}
      </div>
      <form
        className="mt-1 flex items-center gap-1.5"
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
          placeholder={youName ? `Message as ${youName}` : "Sit to use your name"}
          className="h-8 min-w-0 flex-1 rounded-md border border-white/15 bg-black/30 px-2 text-xs text-white placeholder:text-white/35 outline-none ring-amber-300/30 focus:ring-2"
        />
        <Button type="submit" size="sm" className="h-8 px-2" disabled={!draft.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
