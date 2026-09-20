import http from "node:http";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import express from "express";
import { WebSocketServer, type WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "../shared/types.js";
import { discordVoiceUrlFromEnv } from "../shared/discord.js";
import { donateUrlFromEnv } from "../shared/donate.js";
import { isValidRoomCode, normalizeRoomCode, randomRoomCode, ROOM_CODE_HINT } from "../shared/roomCode.js";
import {
  addBotSeat,
  addHumanSeat,
  createRoom,
  discardCard,
  drawStock,
  goOut,
  isRoomExpired,
  markConnected,
  maybeAct,
  nextRound,
  rematch,
  endGame,
  leaveSeat,
  removeSeat,
  renameSeat,
  setSeatAvatar,
  rollDealer,
  setAcePoints,
  setAutoMove,
  setWagerRules,
  setWagerStake,
  setJokers,
  setWildFaceValue,
  startGame,
  setBotPlay,
  setSeatLearning,
  takeDiscard,
  toClientView,
  type Room,
} from "./room.js";
import { clearRoomChat, postChat, roomChat } from "./chat.js";
import { forgetSitWorst, listSitStats, loadSitStats, restoreSitWorst, sitStatsDbPath, wipeSitStats } from "./sitStats.js";
import type { ChatMessage } from "../shared/chat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 43133);
const isProd = process.env.NODE_ENV === "production";

const rooms = new Map<string, Room>();
const sockets = new Map<WebSocket, { playerId: string; roomCode: string; name: string }>();

function getRoom(code: string): Room {
  return openRoom(code).room;
}

function openRoom(code: string): { room: Room; created: boolean } {
  const existing = rooms.get(code);
  if (existing) return { room: existing, created: false };
  const room = createRoom(code);
  rooms.set(code, room);
  return { room, created: true };
}

function helloOk(room: Room, playerId: string, created: boolean): ServerMessage {
  return {
    type: "hello-ok",
    playerId,
    roomCode: room.code,
    createdAt: room.createdAt,
    resumed: !created && room.seats.some((seat) => seat.id === playerId),
  };
}

function send(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(room: Room) {
  for (const [ws, meta] of sockets) {
    if (meta.roomCode !== room.code) continue;
    send(ws, { type: "state", state: toClientView(room, meta.playerId) });
  }
}

function vacateCurrentSeat(playerId: string, roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.seats.some((seat) => seat.id === playerId)) return;
  leaveSeat(room, playerId);
  broadcast(room);
}

function sendChatSnapshot(ws: WebSocket, roomCode: string) {
  send(ws, { type: "chat", messages: roomChat(roomCode) });
}

function broadcastChat(roomCode: string, message: ChatMessage) {
  for (const [ws, meta] of sockets) {
    if (meta.roomCode !== roomCode) continue;
    send(ws, { type: "chat-append", message });
  }
}

function speakerName(room: Room, playerId: string, fallback: string): string {
  return room.seats.find((seat) => seat.id === playerId)?.name ?? fallback.trim() ?? "Guest";
}

function handleMessage(ws: WebSocket, raw: ClientMessage) {
  const meta = sockets.get(ws);
  if (!meta) return;

  if (raw.type === "hello") {
    meta.playerId = raw.playerId || meta.playerId;
    if (raw.name) meta.name = raw.name;
    if (raw.name) {
      const room = rooms.get(meta.roomCode);
      if (room) renameSeat(room, meta.playerId, raw.name);
    }
    if (raw.avatar) {
      const room = rooms.get(meta.roomCode);
      if (room) setSeatAvatar(room, meta.playerId, raw.avatar);
    }
    if (typeof raw.learning === "boolean") {
      const room = rooms.get(meta.roomCode);
      if (room) setSeatLearning(room, meta.playerId, raw.learning);
    }
    const room = rooms.get(meta.roomCode);
    if (room) {
      markConnected(room, meta.playerId, true);
      send(ws, helloOk(room, meta.playerId, false));
      broadcast(room);
      sendChatSnapshot(ws, room.code);
    }
    return;
  }

  if (raw.type === "newRoom") {
    vacateCurrentSeat(meta.playerId, meta.roomCode);
    const code = randomRoomCode((c) => rooms.has(c));
    meta.roomCode = code;
    const { room, created } = openRoom(code);
    send(ws, helloOk(room, meta.playerId, created));
    send(ws, { type: "state", state: toClientView(room, meta.playerId) });
    sendChatSnapshot(ws, code);
    return;
  }

  if (raw.type === "join") {
    const code = normalizeRoomCode(raw.roomCode);
    if (!isValidRoomCode(code)) {
      send(ws, { type: "error", message: ROOM_CODE_HINT });
      return;
    }
    if (code !== meta.roomCode) vacateCurrentSeat(meta.playerId, meta.roomCode);
    meta.roomCode = code;
    const { room, created } = openRoom(code);
    markConnected(room, meta.playerId, true);
    send(ws, helloOk(room, meta.playerId, created));
    broadcast(room);
    sendChatSnapshot(ws, code);
    return;
  }

  if (raw.type === "chat") {
    const room = getRoom(meta.roomCode);
    if (raw.name) meta.name = raw.name;
    const name = speakerName(room, meta.playerId, meta.name);
    const result = postChat(room.code, meta.playerId, name, raw.text);
    if (result.error) {
      send(ws, { type: "error", message: result.error });
      return;
    }
    if (result.message) broadcastChat(room.code, result.message);
    return;
  }

  const room = getRoom(meta.roomCode);
  const playerId = meta.playerId;
  let error: string | null = null;

  try {
  switch (raw.type) {
    case "setName":
      meta.name = raw.name;
      renameSeat(room, playerId, raw.name);
      break;
    case "sit":
      meta.name = raw.name;
      error = addHumanSeat(room, playerId, raw.name, raw.avatar);
      if (!error && typeof raw.learning === "boolean") {
        setSeatLearning(room, playerId, raw.learning);
      }
      break;
    case "setLearning":
      error = setSeatLearning(room, playerId, raw.learning);
      break;
    case "setAvatar":
      error = setSeatAvatar(room, playerId, raw.avatar);
      break;
    case "stand":
      error = leaveSeat(room, playerId);
      break;
    case "addBot":
      error = addBotSeat(room, raw.name, playerId);
      break;
    case "removePlayer":
      error = removeSeat(room, raw.playerId);
      break;
    case "setJokers":
      error = setJokers(room, raw.jokers);
      break;
    case "setAcePoints":
      error = setAcePoints(room, raw.acePoints === 1 ? 1 : 15);
      break;
    case "setWildFaceValue":
      error = setWildFaceValue(room, raw.wildFaceValue);
      break;
    case "setAutoMove":
      error = setAutoMove(room, raw.autoMove);
      break;
    case "setWagerRules":
      error = setWagerRules(room, raw.wagerRules);
      break;
    case "setWagerStake":
      error = setWagerStake(room, raw.stake);
      break;
    case "rollDealer":
      error = rollDealer(room);
      break;
    case "startGame":
      error = startGame(room, playerId);
      break;
    case "drawStock":
      error = drawStock(room, playerId);
      break;
    case "takeDiscard":
      error = takeDiscard(room, playerId);
      break;
    case "discard":
      error = discardCard(room, playerId, raw.cardId);
      break;
    case "goOut":
      error = goOut(room, playerId, raw.cardId);
      break;
    case "nextRound":
      error = nextRound(room);
      break;
    case "rematch":
      error = rematch(room);
      break;
    case "endGame":
      error = endGame(room, playerId);
      break;
    case "setBotPlay":
      error = setBotPlay(room, playerId, raw.playerId, raw.on);
      break;
    case "forgetSitStats": {
      const seat = room.seats.find((item) => item.id === playerId);
      if (!seat || seat.isBot) {
        error = "Join to take a name off the Stats board.";
        break;
      }
      if (raw.what === "worst") error = forgetSitWorst(raw.handle);
      else if (raw.what === "restoreWorst") error = restoreSitWorst(raw.handle);
      else error = wipeSitStats(raw.handle);
      break;
    }
    default:
      error = "Unknown action.";
  }
  } catch (err) {
    console.error("action failed", raw.type, err);
    error = "The table hit a snag. Try that again.";
  }

  if (error) send(ws, { type: "error", message: error });
  if (raw.type === "forgetSitStats") {
    for (const other of rooms.values()) broadcast(other);
  } else {
    broadcast(room);
  }
}

async function main() {
  loadSitStats();
  const app = express();

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      rooms: rooms.size,
      sitNames: listSitStats().length,
      sitDb: sitStatsDbPath(),
      donateUrl: donateUrlFromEnv(),
      discordVoiceUrl: discordVoiceUrlFromEnv(),
    });
  });

  const tarballCandidates = [
    path.resolve(__dirname, "../three-thirteen-playtest.tar.gz"),
    "/opt/cursor/artifacts/three-thirteen-playtest.tar.gz",
  ];
  app.get("/three-thirteen-playtest.tar.gz", (_req, res) => {
    const file = tarballCandidates.find((candidate) => existsSync(candidate));
    if (!file) {
      res.status(404).send("tarball missing");
      return;
    }
    res.download(file, "three-thirteen-playtest.tar.gz");
  });

  if (isProd) {
    const dist = path.resolve(__dirname, "../dist");
    app.use(express.static(dist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, "../vite.config.ts"),
      server: { middlewareMode: true, allowedHosts: true, host: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "/ws", "http://localhost");
    const requested = url.searchParams.get("room");
    const requestedNorm = requested ? normalizeRoomCode(requested) : "";
    const requestedInvalid = Boolean(requested && !isValidRoomCode(requestedNorm));
    const roomCode = requested && isValidRoomCode(requestedNorm)
      ? requestedNorm
      : randomRoomCode((c) => rooms.has(c));
    const playerId = url.searchParams.get("player") || randomUUID();
    sockets.set(ws, { playerId, roomCode, name: "Guest" });
    const opened = openRoom(roomCode);
    markConnected(opened.room, playerId, true);
    send(ws, helloOk(opened.room, playerId, opened.created));
    send(ws, { type: "state", state: toClientView(opened.room, playerId) });
    sendChatSnapshot(ws, roomCode);
    if (requestedInvalid) {
      send(ws, { type: "error", message: ROOM_CODE_HINT });
    }

    ws.on("message", (data) => {
      try {
        const parsed = JSON.parse(String(data)) as ClientMessage;
        handleMessage(ws, parsed);
      } catch (err) {
        console.error("ws message failed", err);
        send(ws, { type: "error", message: "Bad message." });
      }
    });

    ws.on("close", () => {
      const meta = sockets.get(ws);
      sockets.delete(ws);
      if (!meta) return;
      const stillHere = [...sockets.values()].some(
        (item) => item.playerId === meta.playerId && item.roomCode === meta.roomCode,
      );
      if (!stillHere) {
        const room = rooms.get(meta.roomCode);
        if (room) {
          markConnected(room, meta.playerId, false);
          broadcast(room);
        }
      }
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      try {
        if (isRoomExpired(room, now) && room.phase === "lobby" && room.seats.length === 0) {
          rooms.delete(code);
          clearRoomChat(code);
          continue;
        }
        if (maybeAct(room, now)) broadcast(room);
      } catch (err) {
        console.error("tick failed", code, err);
      }
    }
  }, 200);

  process.on("uncaughtException", (err) => {
    console.error("uncaughtException", err);
  });
  process.on("unhandledRejection", (err) => {
    console.error("unhandledRejection", err);
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Three Thirteen listening on http://127.0.0.1:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
