import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@shared/chat";
import type { ClientMessage, ClientView, ServerMessage } from "@shared/types";
import { isValidRoomCode, normalizeRoomCode, pendingInvalidRoom, ROOM_CODE_HINT } from "@shared/roomCode";
import {
  BACK_HINT,
  preferredRoomCode,
  RECONNECTING_HINT,
  reconnectDelayMs,
  ROOM_LOST_HINT,
  roomWasWiped,
} from "@shared/resume";
import { useA11y } from "./lib/A11yContext";
import { useLearning } from "./lib/LearningContext";
import { readTableSession, sessionEpoch, writeTableSession } from "./lib/session";
import { readAvatar, writeAvatar } from "./lib/avatar";
import { getPlayerId, readRoomEpoch, roomFromUrl, writeRoomEpoch, writeRoomToUrl } from "./lib/utils";
import { useSitName } from "./lib/NameContext";
import { hasSitName, normalizeSitName } from "@shared/sitName";
import { isAvatarId, type AvatarId } from "@shared/avatars";
import { ChatPanel } from "./components/ChatPanel";
import { HowToPlayDialog } from "./components/HowToPlay";
import { Lobby } from "./components/Lobby";
import { Table } from "./components/Table";

type LinkStatus = "connecting" | "open" | "reconnecting" | "back";

function connectRoomArg(): string | null {
  const url = roomFromUrl();
  if (pendingInvalidRoom(url)) return null;
  return preferredRoomCode(url, readTableSession()?.roomCode);
}

export function App() {
  const { prefs } = useA11y();
  const { learning } = useLearning();
  const { name, setName } = useSitName();
  const playerId = useMemo(() => getPlayerId(), []);
  const [avatar, setAvatar] = useState<AvatarId | null>(() => readAvatar());
  const [joinCode, setJoinCode] = useState(() => roomFromUrl() ?? readTableSession()?.roomCode ?? "");
  const [urlHold, setUrlHold] = useState(() => pendingInvalidRoom(roomFromUrl()));
  const [state, setState] = useState<ClientView | null>(null);
  const [banner, setBanner] = useState<string | null>(() => {
    const held = pendingInvalidRoom(roomFromUrl());
    return held ? ROOM_CODE_HINT : null;
  });
  const [connected, setConnected] = useState(false);
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("connecting");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [roomLost, setRoomLost] = useState(false);
  const chatOpenRef = useRef(false);
  const tableChatRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const urlHoldRef = useRef(urlHold);
  urlHoldRef.current = urlHold;
  const lastRoomRef = useRef<string | null>(null);
  const aliveRef = useRef(true);
  const attemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const backTimerRef = useRef<number | null>(null);
  const hiddenAtRef = useRef(0);
  const nameRef = useRef(name);
  nameRef.current = name;
  const avatarRef = useRef(avatar);
  avatarRef.current = avatar;
  const learningRef = useRef(learning);
  learningRef.current = learning;

  function clearHold() {
    urlHoldRef.current = null;
    setUrlHold(null);
  }

  function rememberTable(code: string, createdAt: number) {
    lastRoomRef.current = code;
    writeRoomEpoch(code, createdAt);
    writeTableSession({ roomCode: code, playerId, createdAt });
    if (!urlHoldRef.current) {
      writeRoomToUrl(code);
      setJoinCode(code);
    }
  }

  function adoptRoom(code: string) {
    clearHold();
    setRoomLost(false);
    writeRoomToUrl(code);
    setJoinCode(code);
    setBanner(null);
  }

  function send(message: ClientMessage) {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function clearReconnectTimer() {
    if (reconnectTimerRef.current != null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }

  function showBack() {
    setLinkStatus("back");
    if (backTimerRef.current != null) window.clearTimeout(backTimerRef.current);
    backTimerRef.current = window.setTimeout(() => {
      backTimerRef.current = null;
      setLinkStatus((status) => (status === "back" ? "open" : status));
    }, 3500);
  }

  function scheduleReconnect() {
    if (!aliveRef.current || reconnectTimerRef.current != null) return;
    const delay = reconnectDelayMs(attemptRef.current);
    attemptRef.current += 1;
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      if (!aliveRef.current) return;
      connect(connectRoomArg());
    }, delay);
  }

  function connect(room: string | null) {
    const previous = wsRef.current;
    wsRef.current = null;
    if (previous && previous.readyState < WebSocket.CLOSING) {
      previous.close();
    }
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const params = new URLSearchParams({ player: playerId });
    if (room && isValidRoomCode(normalizeRoomCode(room))) {
      params.set("room", normalizeRoomCode(room));
    }
    const ws = new WebSocket(`${proto}://${window.location.host}/ws?${params}`);
    wsRef.current = ws;
    ws.onopen = () => {
      attemptRef.current = 0;
      setConnected(true);
      ws.send(
        JSON.stringify({
          type: "hello",
          playerId,
          name: nameRef.current,
          learning: learningRef.current,
          ...(avatarRef.current ? { avatar: avatarRef.current } : {}),
        } satisfies ClientMessage),
      );
    };
    ws.onclose = () => {
      setConnected(false);
      if (!aliveRef.current) return;
      if (wsRef.current !== ws && wsRef.current !== null) return;
      setLinkStatus("reconnecting");
      scheduleReconnect();
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data)) as ServerMessage;
      if (msg.type === "hello-ok") {
        if (lastRoomRef.current && lastRoomRef.current !== msg.roomCode) {
          setMessages([]);
        }
        const prev = readRoomEpoch() ?? sessionEpoch(readTableSession());
        const next = { code: msg.roomCode, createdAt: msg.createdAt };
        if (!urlHoldRef.current && roomWasWiped(prev, next)) {
          setRoomLost(true);
          setBanner(ROOM_LOST_HINT);
          setLinkStatus("open");
        } else if (msg.resumed) {
          setRoomLost(false);
          showBack();
        } else {
          setLinkStatus((status) => (status === "reconnecting" ? "open" : status === "connecting" ? "open" : status));
        }
        rememberTable(msg.roomCode, msg.createdAt);
        if (urlHoldRef.current) {
          setJoinCode(urlHoldRef.current);
        }
      }
      if (msg.type === "state") {
        const prev = readRoomEpoch() ?? sessionEpoch(readTableSession());
        const next = { code: msg.state.roomCode, createdAt: msg.state.createdAt };
        if (!urlHoldRef.current && roomWasWiped(prev, next)) {
          setRoomLost(true);
          setBanner(ROOM_LOST_HINT);
        }
        rememberTable(next.code, next.createdAt);
        setState(msg.state);
        if (msg.state.seated && !roomWasWiped(prev, next)) {
          setRoomLost(false);
        }
      }
      if (msg.type === "chat") {
        setMessages(msg.messages);
      }
      if (msg.type === "chat-append") {
        setMessages((prev) => [...prev, msg.message]);
        if (!chatOpenRef.current && !tableChatRef.current && msg.message.playerId !== playerId) {
          setUnread((n) => n + 1);
        }
      }
      if (msg.type === "error") {
        setBanner(msg.message);
        setTimeout(() => setBanner(null), 7000);
      }
    };
  }

  function forceReconnect() {
    if (!aliveRef.current) return;
    clearReconnectTimer();
    setLinkStatus((status) => (status === "open" || status === "back" ? "reconnecting" : status));
    connect(connectRoomArg());
  }

  useEffect(() => {
    aliveRef.current = true;
    connect(connectRoomArg());

    function onOnline() {
      forceReconnect();
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      const slept = hiddenAtRef.current > 0 && Date.now() - hiddenAtRef.current > 1500;
      hiddenAtRef.current = 0;
      const ws = wsRef.current;
      if (slept || !ws || ws.readyState !== WebSocket.OPEN) {
        forceReconnect();
        return;
      }
      ws.send(
        JSON.stringify({
          type: "hello",
          playerId,
          name: nameRef.current,
          learning: learningRef.current,
          ...(avatarRef.current ? { avatar: avatarRef.current } : {}),
        } satisfies ClientMessage),
      );
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) forceReconnect();
      else onVisibility();
    }

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      aliveRef.current = false;
      clearReconnectTimer();
      if (backTimerRef.current != null) window.clearTimeout(backTimerRef.current);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      const ws = wsRef.current;
      wsRef.current = null;
      ws?.close();
    };
    // One socket for the tab lifetime; reconnect uses URL + persisted session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (avatar) writeAvatar(avatar);
  }, [avatar]);

  useEffect(() => {
    if (!state) return;
    const you = state.players.find((player) => player.isYou);
    const taken = new Set(
      state.players.filter((player) => !player.isYou && player.avatar).map((player) => player.avatar),
    );
    if (you?.avatar && isAvatarId(you.avatar) && !avatar) {
      setAvatar(you.avatar);
      writeAvatar(you.avatar);
      return;
    }
    if (avatar && taken.has(avatar) && you?.avatar !== avatar) {
      setAvatar(you?.avatar && isAvatarId(you.avatar) ? you.avatar : null);
    }
  }, [state, avatar]);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) setUnread(0);
  }, [chatOpen]);

  useEffect(() => {
    if (!connected) return;
    send({ type: "setLearning", learning });
  }, [connected, learning]);

  if (!state) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#071610] text-emerald-100/70">
        {linkStatus === "reconnecting"
          ? RECONNECTING_HINT
          : connected
            ? "Dealing the lobby…"
            : "Connecting to the table…"}
      </div>
    );
  }

  const playing = state.phase !== "lobby";
  const tableChat = playing && !urlHold && prefs.chatOverlay;
  tableChatRef.current = tableChat;
  const showLost = roomLost;
  const showHold = Boolean(urlHold) && !showLost;
  const showError = Boolean(banner) && !showLost && !showHold;
  const showReconnect = linkStatus === "reconnecting" && !showLost;
  const showBackBanner = linkStatus === "back" && !showLost && !showHold && !showError;

  return (
    <>
      {showLost || showHold || showError || showReconnect || showBackBanner ? (
        <div
          role="status"
          aria-live="polite"
          className={
            showBackBanner
              ? "link-banner link-banner-ok"
              : showReconnect
                ? "link-banner link-banner-warn"
                : "link-banner link-banner-lost"
          }
        >
          {showLost
            ? ROOM_LOST_HINT
            : showHold
              ? (banner ?? ROOM_CODE_HINT)
              : showError
                ? banner
                : showReconnect
                  ? RECONNECTING_HINT
                  : BACK_HINT}
        </div>
      ) : null}
      {playing && !urlHold ? (
        <Table
          state={state}
          onDrawStock={() => send({ type: "drawStock" })}
          onTakeDiscard={() => send({ type: "takeDiscard" })}
          onDiscard={(cardId) => send({ type: "discard", cardId })}
          onGoOut={(cardId) => send({ type: "goOut", cardId })}
          onNextRound={() => send({ type: "nextRound" })}
          onRematch={() => send({ type: "rematch" })}
          onEndGame={() => send({ type: "endGame" })}
          onLeaveRoom={() => {
            send({ type: "stand" });
            send({ type: "newRoom" });
          }}
          onOpenChat={() => setChatOpen(true)}
          chatOverlay={prefs.chatOverlay}
          chatMessages={messages}
          onSendChat={(text) => send({ type: "chat", text, name })}
          onSetBotPlay={(playerId, on) => send({ type: "setBotPlay", playerId, on })}
        />
      ) : (
        <Lobby
          state={state}
          name={name}
          setName={setName}
          avatar={avatar}
          onAvatar={(next) => {
            setAvatar(next);
            writeAvatar(next);
            send({ type: "setAvatar", avatar: next });
          }}
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          heldInvalidCode={urlHold}
          roomLost={roomLost}
          onSit={(sitName) => {
            const who = normalizeSitName(sitName ?? name);
            if (!hasSitName(who)) return;
            setRoomLost(false);
            setBanner(null);
            send({
              type: "sit",
              name: who,
              learning,
              ...(avatar ? { avatar } : {}),
            });
          }}
          onAddBot={() => send({ type: "addBot" })}
          onRemove={(id) => send({ type: "removePlayer", playerId: id })}
          onJokers={(jokers) => send({ type: "setJokers", jokers })}
          onAcePoints={(acePoints) => send({ type: "setAcePoints", acePoints })}
          onWildFaceValue={(wildFaceValue) => send({ type: "setWildFaceValue", wildFaceValue })}
          onAutoMove={(autoMove) => send({ type: "setAutoMove", autoMove })}
          onWagerRules={(wagerRules) => send({ type: "setWagerRules", wagerRules })}
          onWagerStake={(stake) => send({ type: "setWagerStake", stake })}
          onRoll={() => send({ type: "rollDealer" })}
          onStart={() => send({ type: "startGame" })}
          onNewRoom={() => {
            clearHold();
            setRoomLost(false);
            send({ type: "newRoom" });
          }}
          onLeaveRoom={() => {
            clearHold();
            setRoomLost(false);
            send({ type: "stand" });
            send({ type: "newRoom" });
          }}
          onSetBotPlay={(playerId, on) => send({ type: "setBotPlay", playerId, on })}
          onForgetSitStats={(handle, what) => send({ type: "forgetSitStats", handle, what })}
          onJoinCode={() => {
            const code = normalizeRoomCode(joinCode);
            if (!isValidRoomCode(code)) {
              setBanner(ROOM_CODE_HINT);
              return;
            }
            adoptRoom(code);
            send({ type: "join", roomCode: code });
          }}
        />
      )}
      <HowToPlayDialog />
      <ChatPanel
        open={chatOpen}
        onToggle={() => setChatOpen((on) => !on)}
        messages={messages}
        youId={state.youId}
        youName={state.players.find((player) => player.isYou)?.name ?? name}
        unread={unread}
        onSend={(text) => send({ type: "chat", text, name })}
        discordVoiceUrl={state.discordVoiceUrl}
      />
    </>
  );
}