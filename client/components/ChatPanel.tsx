import { MessageCircle, Mic, MicOff, PhoneOff, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CHAT_MAX_LEN, formatChatTime, type ChatMessage } from "@shared/chat";
import { useA11y } from "../lib/A11yContext";
import { cn } from "../lib/utils";
import { DiscordVoiceLink } from "./DiscordVoiceLink";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

export function ChatPanel({
  open,
  onToggle,
  messages,
  youId,
  youName,
  unread,
  onSend,
  discordVoiceUrl,
  sheet = true,
  onTalk,
}: {
  open: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  youId: string;
  youName: string;
  unread: number;
  onSend: (text: string) => void;
  discordVoiceUrl?: string | null;
  /** Lobby / scoreboard sheet. Off during a hand so Talk does not cover the felt. */
  sheet?: boolean;
  onTalk?: () => void;
}) {
  const { prefs, patch } = useA11y();
  const [draft, setDraft] = useState("");
  const [voice, setVoice] = useState<"off" | "live" | "muted" | "denied">("off");
    const [voiceNote, setVoiceNote] = useState(
      "Voice chat lives on Discord for now. Local mic stays on this device only.",
    );
  const streamRef = useRef<MediaStream | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    return () => stopVoice();
  }, []);

  function stopVoice() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setVoice("off");
  }

  async function joinVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setVoice("live");
      setVoiceNote("Mic is open on this device only. Friends cannot hear you yet.");
    } catch {
      setVoice("denied");
      setVoiceNote(
        "Mic was blocked. Text chat is still the main way to talk — try the mic again if you want local voice on this device.",
      );
    }
  }

  function toggleMute() {
    const stream = streamRef.current;
    if (!stream) return;
    const live = voice !== "muted";
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !live ? true : false;
    });
    setVoice(live ? "muted" : "live");
  }

  function submit() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (onTalk ? onTalk() : onToggle())}
        className={cn(
          "fixed bottom-4 right-4 z-30 flex h-12 items-center gap-2 rounded-full bg-amber-400 px-4 font-bold text-[#3b2200] shadow-lg sm:bottom-5",
          sheet && open && "hidden",
        )}
        aria-label={sheet ? "Open table talk" : "Focus table talk"}
      >
        <MessageCircle className="h-5 w-5" />
        Talk
        {unread > 0 ? (
          <span className="rounded-full bg-[#3b2200] px-1.5 text-xs text-amber-200">{unread}</span>
        ) : null}
      </button>

      <aside
        className={cn(
          "lobby-card z-30 flex flex-col border-amber-200/15",
          sheet && open
            ? "fixed inset-x-0 bottom-0 h-[min(70dvh,28rem)] rounded-t-3xl sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[min(72dvh,36rem)] sm:w-[22rem] sm:rounded-3xl"
            : "hidden",
        )}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="font-display text-lg font-bold text-amber-100">Table talk</p>
            <p className="text-[11px] text-emerald-100/55">Text is live · Voice chat lives on Discord for now.</p>
          </div>
          <button type="button" onClick={onToggle} className="rounded-full p-1 text-emerald-100/70 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div ref={scroller} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {messages.length === 0 ? (
            <p className="px-1 text-sm text-emerald-100/50">
              Say hello. Messages stay in this room and use your seated name
              {youName ? ` (${youName})` : ""}.
            </p>
          ) : (
            messages.map((msg) => {
              const mine = msg.playerId === youId;
              return (
                <div key={msg.id} className={cn("max-w-[92%]", mine ? "ml-auto text-right" : "")}>
                  <p className="text-[11px] text-amber-100/60">
                    {mine ? "You" : msg.name} · {formatChatTime(msg.at)}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 inline-block rounded-2xl px-3 py-1.5 text-sm leading-snug",
                      mine ? "bg-amber-400/20 text-amber-50" : "bg-black/35 text-emerald-50",
                    )}
                  >
                    {msg.text}
                  </p>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-white/10 px-3 py-2">
          <div className="mb-2">
            <DiscordVoiceLink url={discordVoiceUrl} />
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {voice === "off" || voice === "denied" ? (
              <Button size="sm" variant={voice === "denied" ? "gold" : "outline"} onClick={() => void joinVoice()}>
                <Mic className="h-3.5 w-3.5" />
                {voice === "denied" ? "Try mic again" : "Local mic"}
              </Button>
            ) : (
              <>
                <Button size="sm" variant={voice === "muted" ? "gold" : "outline"} onClick={toggleMute}>
                  {voice === "muted" ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  {voice === "muted" ? "Unmute" : "Mute"}
                </Button>
                <Button size="sm" variant="secondary" onClick={stopVoice}>
                  <PhoneOff className="h-3.5 w-3.5" />
                  Leave voice
                </Button>
              </>
            )}
          </div>
          <p className="mb-2 text-[11px] leading-snug text-emerald-100/45">{voiceNote}</p>
          <div className="mb-2 text-emerald-50">
            <Checkbox
              label="Chat overlay while playing"
              checked={prefs.chatOverlay}
              onChange={(e) => patch({ chatOverlay: e.currentTarget.checked })}
            />
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={CHAT_MAX_LEN}
              placeholder={youName ? `Message as ${youName}` : "Type a name or sit first"}
              className="h-10 flex-1 rounded-md border border-white/15 bg-black/30 px-3 text-sm text-white placeholder:text-white/35 outline-none ring-amber-300/30 focus:ring-2"
            />
            <Button type="submit" size="sm" className="h-10 px-3" disabled={!draft.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
