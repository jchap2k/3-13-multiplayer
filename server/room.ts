import { randomUUID } from "node:crypto";
import {
  buildShoe,
  dealCountForRound,
  deckCountForPlayers,
  formatCard,
  ROUND_COUNT,
  shuffle,
  wildRankForRound,
  wildSpoken,
  type AcePoints,
} from "../shared/cards.js";
import { hasSitName, NEED_SIT_NAME, normalizeSitName } from "../shared/sitName.js";
import { shouldAutoAddSoloBot, SOLO_START_BOT_NOTE } from "../shared/soloStart.js";
import { bestArrangement, canMeldAll, goOutCardIds } from "../shared/melds.js";
import { chooseDiscard, chooseDraw } from "../shared/bot.js";
import { discordVoiceUrlFromEnv } from "../shared/discord.js";
import { donateUrlFromEnv } from "../shared/donate.js";
import { AUTO_NEXT_MS } from "../shared/scoreboard.js";
import { HUMAN_TURN_MS } from "../shared/turnClock.js";
import { lastTurnSeatIds } from "../shared/turnOrder.js";
import { claimIfFree, isAvatarId, unusedAvatar, type AvatarId } from "../shared/avatars.js";
import {
  formatPlayMoney,
  clampStake,
  INITIAL_STAKE,
  isPerfectSweep,
  settleWager,
  shouldDoubleStake,
  nextStake,
  type WagerSettlement,
} from "../shared/wager.js";
import {
  normalizeHandle,
  recordMatchOutcome,
  type MatchRecord,
} from "../shared/mailboxStats.js";
import { goldGlowFor, ingestHumanSitStats, listSitGlobal, listSitStats } from "./sitStats.js";
import type { Card, ClientView, Phase, TurnPhase } from "../shared/types.js";

export { HUMAN_TURN_MS };
export const ABSENT_TURN_MS = 4_000;
export const BOT_TURN_MS = 700;
const ROOM_IDLE_MS = 4 * 60 * 60 * 1000;

const BOT_NAMES = [
  "Day Analyst",
  "Night Watch",
  "Copy Desk",
  "Hall Monitor",
  "Fact Checker",
  "Weekend Desk",
  "Wire Editor",
  "Duty Officer",
];

export interface Seat {
  id: string;
  name: string;
  isBot: boolean;
  botPlay: boolean;
  connected: boolean;
  lastSeen: number;
  hand: Card[];
  score: number;
  roundScores: number[];
  avatar: AvatarId | null;
  mailboxId: string | null;
  mailboxHandle: string | null;
  /** Current learning preference. Humans default off — matches write to Stats. */
  learning: boolean;
  /** Snapshot at Start — ingest uses this, not a mid-match toggle. */
  learningMatch: boolean;
}

export interface Room {
  code: string;
  createdAt: number;
  updatedAt: number;
  hostId: string | null;
  jokers: boolean;
  acePoints: AcePoints;
  wildFaceValue: boolean;
  autoMove: boolean;
  wagerRules: boolean;
  wagerStakeStart: number;
  wagerStake: number;
  wagerStakePath: number[];
  wagerSuddenDeath: boolean;
  wagerSuddenDeathHands: number;
  firstOutIds: (string | null)[];
  wagerSettlement: WagerSettlement | null;
  dealerId: string | null;
  seats: Seat[];
  phase: Phase;
  round: number;
  stock: Card[];
  discard: Card[];
  scoopedDiscard: Card | null;
  currentSeatId: string | null;
  turnPhase: TurnPhase | null;
  wentOutId: string | null;
  lastTurnQueue: string[];
  message: string;
  revealed?: ClientView["revealed"];
  winnerIds: string[];
  turnEndsAt: number | null;
  autoNextAt: number | null;
  turnsThisRound: number;
}

export function createRoom(code: string): Room {
  const now = Date.now();
  return {
    code,
    createdAt: now,
    updatedAt: now,
    hostId: null,
    jokers: false,
    acePoints: 15,
    wildFaceValue: true,
    autoMove: false,
    wagerRules: false,
    wagerStakeStart: INITIAL_STAKE,
    wagerStake: INITIAL_STAKE,
    wagerStakePath: [INITIAL_STAKE],
    wagerSuddenDeath: false,
    wagerSuddenDeathHands: 0,
    firstOutIds: [],
    wagerSettlement: null,
    dealerId: null,
    seats: [],
    phase: "lobby",
    round: 1,
    stock: [],
    discard: [],
    scoopedDiscard: null,
    currentSeatId: null,
    turnPhase: null,
    wentOutId: null,
    lastTurnQueue: [],
    message: "Join, add bots if you want, then start.",
    winnerIds: [],
    turnEndsAt: null,
    autoNextAt: null,
    turnsThisRound: 0,
  };
}

function touch(room: Room) {
  room.updatedAt = Date.now();
}

function seated(room: Room): Seat[] {
  return room.seats;
}

function seatById(room: Room, id: string): Seat | undefined {
  return room.seats.find((seat) => seat.id === id);
}

function nextSeat(room: Room, fromId: string | null): Seat | undefined {
  if (room.seats.length === 0) return undefined;
  if (!fromId) return room.seats[0];
  const index = room.seats.findIndex((seat) => seat.id === fromId);
  return room.seats[(index + 1) % room.seats.length];
}

function ensureHost(room: Room) {
  if (room.hostId && seatById(room, room.hostId) && !seatById(room, room.hostId)?.isBot) {
    return;
  }
  const human = room.seats.find((seat) => !seat.isBot);
  room.hostId = human?.id ?? room.seats[0]?.id ?? null;
}

export function unusedBotName(room: Room): string {
  const used = new Set(room.seats.map((seat) => seat.name));
  const available = BOT_NAMES.filter((name) => !used.has(name));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return `Bot ${room.seats.length + 1}`;
}

export function addHumanSeat(room: Room, playerId: string, name: string, avatar?: string): string | null {
  if (room.phase !== "lobby") return "Game already started.";
  if (seatById(room, playerId)) return null;
  if (room.seats.length >= 8) return "This table is full (8).";
  const trimmed = normalizeSitName(name);
  if (!trimmed) return NEED_SIT_NAME;
  const seatedName = uniqueName(room, trimmed);
  room.seats.push({
    id: playerId,
    name: seatedName,
    isBot: false,
    botPlay: false,
    connected: true,
    lastSeen: Date.now(),
    hand: [],
    score: 0,
    roundScores: [],
    avatar: claimIfFree(
      avatar,
      room.seats.map((seat) => seat.avatar),
    ),
    mailboxId: null,
    mailboxHandle: normalizeHandle(seatedName),
    learning: false,
    learningMatch: false,
  });
  if (!room.hostId) room.hostId = playerId;
  ensureHost(room);
  room.message = `${trimmed} sat down.`;
  touch(room);
  return null;
}

function uniqueName(room: Room, name: string): string {
  const taken = new Set(room.seats.map((seat) => seat.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  let n = 2;
  while (taken.has(`${name} ${n}`.toLowerCase())) n += 1;
  return `${name} ${n}`;
}

export function addBotSeat(room: Room, name?: string, playerId?: string): string | null {
  if (playerId && room.hostId && playerId !== room.hostId) {
    return "Only the host can add a bot.";
  }
  if (room.phase !== "lobby") return "Wait until the match ends to add bots.";
  if (room.seats.length >= 8) return "This table is full (8).";
  const botName = uniqueName(room, (name?.trim() || unusedBotName(room)).slice(0, 24));
  room.seats.push({
    id: `bot-${randomUUID()}`,
    name: botName,
    isBot: true,
    botPlay: false,
    connected: true,
    lastSeen: Date.now(),
    hand: [],
    score: 0,
    roundScores: [],
    avatar: null,
    mailboxId: null,
    mailboxHandle: null,
    learning: false,
    learningMatch: false,
  });
  room.message = `${botName} sat down (bot).`;
  ensureHost(room);
  touch(room);
  return null;
}

/** Stand up in any phase. Host transfers to the next human. Live tables with fewer than two seats (or no humans) return to lobby. */
export function leaveSeat(room: Room, playerId: string): string | null {
  const index = room.seats.findIndex((seat) => seat.id === playerId);
  if (index < 0) return null;
  const removed = room.seats[index]!;
  const live = room.phase !== "lobby";
  const wasCurrent = room.currentSeatId === playerId;
  const wasHost = room.hostId === playerId;
  const nextLive = live && room.phase === "playing" ? nextSeat(room, playerId) : undefined;

  room.seats.splice(index, 1);
  if (room.dealerId === playerId) room.dealerId = null;
  room.lastTurnQueue = room.lastTurnQueue.filter((id) => id !== playerId);
  if (wasHost) room.hostId = null;
  ensureHost(room);

  const humansLeft = room.seats.filter((seat) => !seat.isBot).length;
  const cannotContinue = live && (room.seats.length < 2 || humansLeft === 0);
  const hostName = room.hostId ? seatById(room, room.hostId)?.name : null;
  const hostNote = wasHost && hostName ? ` ${hostName} is host.` : "";

  if (cannotContinue) {
    returnToLobby(room, `${removed.name} left. Need two to play.${hostNote}`);
    return null;
  }

  if (live && wasCurrent && room.phase === "playing") {
    if (room.wentOutId) {
      if (room.lastTurnQueue.length === 0) {
        finishRound(room);
        room.message = `${removed.name} left.${hostNote} ${room.message}`.trim();
        touch(room);
        return null;
      }
      room.currentSeatId = room.lastTurnQueue[0] ?? null;
    } else {
      room.currentSeatId =
        nextLive && seatById(room, nextLive.id) ? nextLive.id : (room.seats[0]?.id ?? null);
    }
    room.turnPhase = "draw";
    armTurnTimer(room, { reset: true });
  } else if (room.currentSeatId === playerId) {
    room.currentSeatId = null;
  }

  room.message = `${removed.name} left the table.${hostNote}`;
  touch(room);
  return null;
}

export function removeSeat(room: Room, playerId: string): string | null {
  if (room.phase !== "lobby") return "Can't remove players after the deal.";
  return leaveSeat(room, playerId);
}

export function setJokers(room: Room, jokers: boolean): string | null {
  if (room.phase !== "lobby") return "House rules are locked after the start.";
  room.jokers = jokers;
  room.message = jokers
    ? "Jokers on — 2 extra permanent wilds per deck."
    : "Jokers off — shoe is N×52 only.";
  touch(room);
  return null;
}

export function setAcePoints(room: Room, acePoints: AcePoints): string | null {
  if (room.phase !== "lobby") return "House rules are locked after the start.";
  room.acePoints = acePoints === 1 ? 1 : 15;
  room.message =
    room.acePoints === 15
      ? "Deadwood aces score 15 (default)."
      : "Deadwood aces score 1.";
  touch(room);
  return null;
}

export function setWildFaceValue(room: Room, wildFaceValue: boolean): string | null {
  if (room.phase !== "lobby") return "House rules are locked after the start.";
  room.wildFaceValue = wildFaceValue;
  room.message = wildFaceValue
    ? "Caught wilds score face value. Jokers score 0."
    : "Caught wilds score 15; jokers score 20.";
  touch(room);
  return null;
}

export function setAutoMove(room: Room, autoMove: boolean): string | null {
  if (room.phase !== "lobby") return "House rules are locked after the start.";
  room.autoMove = autoMove;
  room.message = autoMove
    ? "Idle auto-move on — humans get 3 minutes, then the table plays."
    : "Idle auto-move off — the table waits for each human.";
  touch(room);
  return null;
}

export function setWagerRules(room: Room, wagerRules: boolean): string | null {
  if (room.phase !== "lobby") return "House rules are locked after the start.";
  room.wagerRules = wagerRules;
  room.message = wagerRules
    ? `Wager rules on — play-money chips, ${formatPlayMoney(room.wagerStakeStart)} start. Losers pay the winner.`
    : "Wager rules off — lowest total wins, no chips.";
  touch(room);
  return null;
}

export function setWagerStake(room: Room, stake: number): string | null {
  if (room.phase !== "lobby") return "House rules are locked after the start.";
  const next = clampStake(stake);
  room.wagerStakeStart = next;
  room.wagerStake = next;
  room.wagerStakePath = [next];
  if (room.wagerRules) {
    room.message = `Play-money stake set to ${formatPlayMoney(next)}.`;
  }
  touch(room);
  return null;
}

function resetWagerRuntime(room: Room) {
  room.wagerStake = room.wagerStakeStart;
  room.wagerStakePath = [room.wagerStakeStart];
  room.wagerSuddenDeath = false;
  room.wagerSuddenDeathHands = 0;
  room.firstOutIds = [];
  room.wagerSettlement = null;
}

export function rollDealer(room: Room): string | null {
  if (room.seats.length < 1) return "Need someone seated first.";
  const pick = room.seats[Math.floor(Math.random() * room.seats.length)];
  room.dealerId = pick.id;
  room.message = `First dealer: ${pick.name}`;
  touch(room);
  return null;
}

function rotateDealer(room: Room) {
  if (!room.dealerId) {
    rollDealer(room);
    return;
  }
  const next = nextSeat(room, room.dealerId);
  room.dealerId = next?.id ?? room.seats[0]?.id ?? null;
}

function dealRound(room: Room) {
  const players = seated(room);
  const decks = deckCountForPlayers(players.length);
  const dealCount = dealCountForRound(room.round);
  let shoe = shuffle(buildShoe(decks, room.jokers));
  for (const seat of players) {
    seat.hand = [];
  }
  for (let i = 0; i < dealCount; i++) {
    for (const seat of players) {
      const card = shoe.pop();
      if (card) seat.hand.push(card);
    }
  }
  const up = shoe.pop();
  room.stock = shoe;
  room.discard = up ? [up] : [];
  room.scoopedDiscard = null;
  const left = nextSeat(room, room.dealerId);
  room.currentSeatId = left?.id ?? players[0]?.id ?? null;
  room.turnPhase = "draw";
  room.phase = "playing";
  room.wentOutId = null;
  room.lastTurnQueue = [];
  room.revealed = undefined;
  room.winnerIds = [];
  room.autoNextAt = null;
  room.turnsThisRound = 0;
  armTurnTimer(room, { reset: true });
  const wild = wildRankForRound(room.round);
  const dealer = seatById(room, room.dealerId ?? "");
  room.message = `Round ${room.round}: deal ${dealCount}, ${wildSpoken(wild)} wild. ${left?.name ?? "Someone"} leads.`;
  void dealer;
}

function usesBotBrain(seat: Seat): boolean {
  return seat.isBot || seat.botPlay;
}

function armTurnTimer(room: Room, opts: { reset?: boolean; timeoutMs?: number } = {}) {
  const current = room.currentSeatId ? seatById(room, room.currentSeatId) : undefined;
  if (!current || room.phase !== "playing") {
    room.turnEndsAt = null;
    return;
  }
  if (!usesBotBrain(current) && !room.autoMove) {
    room.turnEndsAt = null;
    return;
  }
  const wait =
    opts.timeoutMs ??
    (usesBotBrain(current) ? BOT_TURN_MS : current.connected ? HUMAN_TURN_MS : ABSENT_TURN_MS);
  const next = Date.now() + wait;
  if (!opts.reset && room.turnEndsAt && room.turnEndsAt > Date.now() && current.connected) {
    return;
  }
  room.turnEndsAt = next;
}

export function startGame(room: Room, playerId?: string): string | null {
  if (playerId && room.hostId && playerId !== room.hostId) {
    return "Only the host (first to sit) can start the game.";
  }
  if (room.phase !== "lobby" && room.phase !== "match_end") {
    return "Finish this match first.";
  }
  let addedSoloBot = false;
  if (shouldAutoAddSoloBot(room.seats)) {
    const added = addBotSeat(room);
    if (added) return added;
    addedSoloBot = true;
  }
  if (room.seats.length < 2) return "Need 2–8 seated players.";
  if (room.seats.length > 8) return "Need 2–8 seated players.";
  if (room.seats.some((seat) => !seat.isBot && !hasSitName(seat.name))) {
    return NEED_SIT_NAME;
  }
  if (!room.dealerId) rollDealer(room);
  room.round = 1;
  resetWagerRuntime(room);
  assignMissingAvatars(room);
  for (const seat of room.seats) {
    seat.score = 0;
    seat.roundScores = [];
    seat.hand = [];
  }
  lockLearningForMatch(room);
  dealRound(room);
  if (addedSoloBot) {
    room.message = `${SOLO_START_BOT_NOTE}. ${room.message}`;
  }
  touch(room);
  return null;
}

export function seatIsLearning(seat: Seat): boolean {
  if (seat.isBot) return false;
  return Boolean(seat.learning);
}

export function seatLearningMatch(seat: Seat): boolean {
  if (seat.isBot) return false;
  return seat.learningMatch ?? seatIsLearning(seat);
}

export function lockLearningForMatch(room: Room) {
  for (const seat of room.seats) {
    seat.learningMatch = seatIsLearning(seat);
  }
}

export function setSeatLearning(room: Room, playerId: string, learning: boolean): string | null {
  const seat = seatById(room, playerId);
  if (!seat || seat.isBot) return null;
  seat.learning = Boolean(learning);
  if (room.phase === "lobby") seat.learningMatch = seat.learning;
  touch(room);
  return null;
}

function statsSkipSeatIds(room: Room): string[] {
  return room.seats.filter((seat) => seat.isBot || seatLearningMatch(seat)).map((seat) => seat.id);
}

/** Face-down rest of the discard becomes the stock; the upcard stays up. */
export function reshuffleIfNeeded(room: Room): boolean {
  if (room.stock.length > 0) return false;
  if (room.discard.length <= 1) return false;
  const top = room.discard[room.discard.length - 1];
  const rest = room.discard.slice(0, -1);
  room.stock = shuffle(rest);
  room.discard = [top];
  return true;
}

export function drawStock(room: Room, playerId: string): string | null {
  const err = assertDraw(room, playerId);
  if (err) return err;
  const reshuffled = reshuffleIfNeeded(room);
  const card = room.stock.pop();
  if (!card) {
    if (room.discard.length === 0) {
      room.message = "No cards left to draw — scoring current deadwood.";
      finishRound(room);
      touch(room);
      return null;
    }
    return "Stock is empty. Take the face-up discard.";
  }
  const seat = seatById(room, playerId)!;
  seat.hand.push(card);
  room.turnPhase = "discard";
  const refilled = reshuffleIfNeeded(room);
  if (reshuffled || refilled) {
    room.message = `${seat.name} drew from the stock. Discard shuffled (upcard stays).`;
  } else {
    room.message = `${seat.name} drew from the stock.`;
  }
  armTurnTimer(room, { reset: true });
  touch(room);
  return null;
}

export function takeDiscard(room: Room, playerId: string): string | null {
  const err = assertDraw(room, playerId);
  if (err) return err;
  const card = room.discard.pop();
  if (!card) return "Discard pile is empty.";
  const seat = seatById(room, playerId)!;
  seat.hand.push(card);
  room.scoopedDiscard = card;
  room.turnPhase = "discard";
  room.message = `${seat.name} took ${formatCard(card)}.`;
  armTurnTimer(room, { reset: true });
  touch(room);
  return null;
}

function assertDraw(room: Room, playerId: string): string | null {
  if (room.phase !== "playing") return "Not in a hand.";
  if (room.currentSeatId !== playerId) return "Not your turn.";
  if (room.turnPhase !== "draw") return "You already drew.";
  return null;
}

function assertDiscard(room: Room, playerId: string, cardId: string): string | null {
  if (room.phase !== "playing") return "Not in a hand.";
  if (room.currentSeatId !== playerId) return "Not your turn.";
  if (room.turnPhase !== "discard") return "Draw first.";
  const seat = seatById(room, playerId);
  if (!seat) return "You are not seated.";
  if (!seat.hand.some((card) => card.id === cardId)) return "That card is not in your hand.";
  return null;
}

export function discardCard(room: Room, playerId: string, cardId: string): string | null {
  const err = assertDiscard(room, playerId, cardId);
  if (err) return err;
  const seat = seatById(room, playerId)!;
  const wild = wildRankForRound(room.round);
  const remaining = seat.hand.filter((card) => card.id !== cardId);
  if (canMeldAll(remaining, wild, room.acePoints, room.wildFaceValue) && remaining.length >= 3) {
    return goOut(room, playerId, cardId);
  }
  const card = seat.hand.find((item) => item.id === cardId)!;
  seat.hand = remaining;
  room.discard.push(card);
  room.scoopedDiscard = null;
  room.message = `${seat.name} discarded ${formatCard(card)}.`;
  advanceAfterDiscard(room, playerId);
  touch(room);
  return null;
}

export function goOut(room: Room, playerId: string, cardId: string): string | null {
  const err = assertDiscard(room, playerId, cardId);
  if (err) return err;
  const seat = seatById(room, playerId)!;
  const wild = wildRankForRound(room.round);
  const remaining = seat.hand.filter((card) => card.id !== cardId);
  if (!canMeldAll(remaining, wild, room.acePoints, room.wildFaceValue)) {
    return "Those cards do not all form legal melds.";
  }
  const card = seat.hand.find((item) => item.id === cardId)!;
  seat.hand = remaining;
  room.discard.push(card);
  room.scoopedDiscard = null;
  if (!room.wentOutId) {
    room.wentOutId = playerId;
    room.lastTurnQueue = lastTurnSeatIds(
      room.seats.map((item) => item.id),
      playerId,
    );
    room.message = `${seat.name} went out with ${formatCard(card)}. One last turn each.`;
  } else {
    room.message = `${seat.name} also cleared their hand.`;
  }
  advanceAfterDiscard(room, playerId);
  touch(room);
  return null;
}

function advanceAfterDiscard(room: Room, playerId: string) {
  room.turnsThisRound += 1;
  if (!room.wentOutId && room.turnsThisRound >= 120) {
    room.message = "Long hand — scoring current deadwood so the match can continue.";
    finishRound(room);
    return;
  }
  if (room.wentOutId) {
    room.lastTurnQueue = room.lastTurnQueue.filter((id) => id !== playerId);
    if (room.lastTurnQueue.length === 0) {
      finishRound(room);
      return;
    }
    room.currentSeatId = room.lastTurnQueue[0];
    room.turnPhase = "draw";
    armTurnTimer(room, { reset: true });
    return;
  }
  const next = nextSeat(room, playerId);
  room.currentSeatId = next?.id ?? null;
  room.turnPhase = "draw";
  armTurnTimer(room, { reset: true });
}

function finishRound(room: Room) {
  room.scoopedDiscard = null;
  const wild = wildRankForRound(room.round);
  const revealed: NonNullable<ClientView["revealed"]> = [];
  for (const seat of room.seats) {
    if (seat.id === room.wentOutId) {
      const arranged = bestArrangement(seat.hand, wild, room.acePoints, room.wildFaceValue);
      seat.roundScores.push(0);
      revealed.push({
        playerId: seat.id,
        name: seat.name,
        melds: arranged.melds,
        deadwood: [],
        roundPoints: 0,
      });
      seat.hand = [];
      continue;
    }
    const arranged = bestArrangement(seat.hand, wild, room.acePoints, room.wildFaceValue);
    seat.score += arranged.deadwoodPoints;
    seat.roundScores.push(arranged.deadwoodPoints);
    revealed.push({
      playerId: seat.id,
      name: seat.name,
      melds: arranged.melds,
      deadwood: arranged.deadwood,
      roundPoints: arranged.deadwoodPoints,
    });
  }
  room.revealed = revealed;
  room.turnPhase = null;
  room.currentSeatId = null;
  room.turnEndsAt = null;
  decideAfterHand(room);
}

function decideAfterHand(room: Room) {
  if (!room.wagerSuddenDeath) {
    room.firstOutIds.push(room.wentOutId);
  }

  let doubled = false;
  if (room.wagerRules && shouldDoubleStake(room.seats.map((seat) => seat.score))) {
    room.wagerStake = nextStake(room.wagerStake);
    room.wagerStakePath.push(room.wagerStake);
    doubled = true;
  }

  const regulationComplete = room.round >= ROUND_COUNT && !room.wagerSuddenDeath;
  const suddenHandComplete = room.wagerSuddenDeath;
  const doubleNote = doubled ? ` Stake doubles to ${formatPlayMoney(room.wagerStake)}.` : "";

  if (!regulationComplete && !suddenHandComplete) {
    room.phase = "round_end";
    room.winnerIds = [];
    room.wagerSettlement = null;
    const wait = `next round in ${Math.round(AUTO_NEXT_MS / 1000)}s, or tap Next round.`;
    if (room.wentOutId) {
      const gone = seatById(room, room.wentOutId);
      room.message = `${gone?.name ?? "Someone"} went out. Scores are up.${doubleNote} ${wait}`;
    } else {
      const stall = (room.message.trim() || "Scoring current deadwood.").replace(/\.$/, "");
      room.message = doubled ? `${stall}.${doubleNote} ${wait}` : `${stall} — ${wait}`;
    }
    room.autoNextAt = Date.now() + AUTO_NEXT_MS;
    return;
  }

  const low = Math.min(...room.seats.map((seat) => seat.score));
  const winners = room.seats.filter((seat) => seat.score === low).map((seat) => seat.id);

  if (room.wagerRules && winners.length > 1) {
    const already = room.wagerSuddenDeath;
    room.wagerSuddenDeath = true;
    room.phase = "round_end";
    room.winnerIds = [];
    room.wagerSettlement = null;
    room.message = already
      ? `Still tied. Another sudden-death hand from deal 3.${doubleNote}`
      : `Tied for first. Sudden death from deal 3 — first unique lowest score wins.${doubleNote}`;
    room.autoNextAt = Date.now() + AUTO_NEXT_MS;
    return;
  }

  room.phase = "match_end";
  room.winnerIds = winners;
  const names = room.seats
    .filter((seat) => room.winnerIds.includes(seat.id))
    .map((seat) => seat.name)
    .join(" & ");
  if (room.wagerRules && winners.length === 1) {
    room.wagerSettlement = settleWager({
      players: room.seats.map((seat) => ({ id: seat.id, name: seat.name, score: seat.score })),
      winnerId: winners[0],
      stake: room.wagerStake,
      stakePath: room.wagerStakePath,
      firstOutIds: room.firstOutIds,
      suddenDeathHands: room.wagerSuddenDeathHands,
    });
    const extra = room.wagerSuddenDeathHands > 0 ? " after sudden death" : "";
    room.message = `Match over. ${names} wins${extra} with ${low} pts.`;
  } else {
    room.wagerSettlement = null;
    room.message = `Match over. ${names} win${room.winnerIds.length === 1 ? "s" : ""} with ${low} pts.`;
  }
  const record = buildMatchRecord(room);
  recordMatchOutcome(record);
  ingestHumanSitStats(record, statsSkipSeatIds(room));
  room.autoNextAt = null;
}

function buildMatchRecord(room: Room): MatchRecord {
  const { sweep, sweeperId } = isPerfectSweep(room.firstOutIds);
  return {
    roomCode: room.code,
    endedAt: Date.now(),
    wager: room.wagerRules,
    stake: room.wagerStake,
    stakePath: [...room.wagerStakePath],
    suddenDeathHands: room.wagerSuddenDeathHands,
    perfectSweep: sweep,
    sweeperId,
    winnerIds: [...room.winnerIds],
    players: room.seats.map((seat) => {
      const owe = room.wagerSettlement?.owes.find((row) => row.playerId === seat.id);
      const won = room.winnerIds.includes(seat.id);
      const wentOutRounds = room.firstOutIds
        .map((id, index) => (id === seat.id ? index + 1 : 0))
        .filter((n) => n > 0);
      return {
        seatId: seat.id,
        mailboxId: seat.mailboxId,
        mailboxHandle: seat.isBot ? null : (seat.mailboxHandle ?? normalizeHandle(seat.name)),
        name: seat.name,
        score: seat.score,
        won,
        firstOutCount: wentOutRounds.length,
        wentOutRounds,
        starVictim: owe?.starVictim ?? Boolean(sweep && seat.id !== sweeperId && !won),
        chipDelta: room.wagerRules
          ? won
            ? (room.wagerSettlement?.winnerCollected ?? 0)
            : -(owe?.amount ?? 0)
          : 0,
      };
    }),
  };
}

/** Test hook: apply posted points and run the same end-of-hand decision as a real score. */
export function completeHandForTest(
  room: Room,
  wentOutId: string | null,
  points: Record<string, number>,
) {
  room.wentOutId = wentOutId;
  const revealed: NonNullable<ClientView["revealed"]> = [];
  for (const seat of room.seats) {
    const pts = wentOutId === seat.id ? 0 : (points[seat.id] ?? 0);
    seat.score += pts;
    seat.roundScores.push(pts);
    revealed.push({
      playerId: seat.id,
      name: seat.name,
      melds: [],
      deadwood: [],
      roundPoints: pts,
    });
  }
  room.revealed = revealed;
  room.turnPhase = null;
  room.currentSeatId = null;
  room.turnEndsAt = null;
  decideAfterHand(room);
  touch(room);
}

export function nextRound(room: Room): string | null {
  if (room.phase !== "round_end") return "No next round yet.";
  if (room.wagerSuddenDeath) {
    room.round = 1;
    room.wagerSuddenDeathHands += 1;
  } else {
    room.round += 1;
  }
  rotateDealer(room);
  dealRound(room);
  touch(room);
  return null;
}

function returnToLobby(room: Room, message: string) {
  room.phase = "lobby";
  room.round = 1;
  room.stock = [];
  room.discard = [];
  room.scoopedDiscard = null;
  room.currentSeatId = null;
  room.turnPhase = null;
  room.wentOutId = null;
  room.lastTurnQueue = [];
  room.revealed = undefined;
  room.winnerIds = [];
  room.autoNextAt = null;
  room.turnEndsAt = null;
  room.dealerId = null;
  room.turnsThisRound = 0;
  resetWagerRuntime(room);
  for (const seat of room.seats) {
    seat.hand = [];
    seat.score = 0;
    seat.roundScores = [];
  }
  room.message = message;
  touch(room);
}

export function rematch(room: Room): string | null {
  if (room.phase !== "match_end") return "Finish the match first.";
  returnToLobby(room, "Same seats. Roll a dealer and start when ready.");
  return null;
}

export function endGame(room: Room, playerId: string): string | null {
  if (room.phase === "lobby") return "The match has not started.";
  if (!room.hostId || playerId !== room.hostId) return "Only the host can end the game.";
  returnToLobby(room, "Host ended the game. Same seats — start when ready.");
  return null;
}

export function markConnected(room: Room, playerId: string, connected: boolean) {
  const seat = seatById(room, playerId);
  if (!seat) return;
  seat.connected = connected;
  seat.lastSeen = Date.now();
  if (connected && !seat.isBot && seat.botPlay) {
    seat.botPlay = false;
    room.message = `${seat.name} is back — Auto-play off.`;
    if (room.phase === "playing" && room.currentSeatId === playerId) {
      if (room.autoMove) armTurnTimer(room, { reset: true });
      else room.turnEndsAt = null;
    }
    return;
  }
  if (room.phase === "playing" && room.currentSeatId === playerId && !seat.isBot) {
    if (!connected && room.autoMove) {
      // Dropped human: don't wait the full turn — table advances quickly.
      armTurnTimer(room, { reset: true, timeoutMs: ABSENT_TURN_MS });
    }
    // Reconnect / hello must NOT reset a running or expired deadline.
    // Refreshing here froze 2-human rooms over flaky tunnels: every hello
    // restarted the clock, so maybeAct never saw now >= turnEndsAt.
  }
}

export function setBotPlay(room: Room, hostId: string, playerId: string, on: boolean): string | null {
  if (!room.hostId || hostId !== room.hostId) return "Only the host can turn Auto-play on for a seat.";
  const seat = seatById(room, playerId);
  if (!seat) return "That seat is empty.";
  if (seat.isBot) return "That seat is already a bot.";
  if (seat.botPlay === on) return null;
  seat.botPlay = on;
  room.message = on ? `Auto-play on for ${seat.name}.` : `Auto-play off for ${seat.name}.`;
  if (room.phase === "playing" && room.currentSeatId === playerId) {
    if (on) armTurnTimer(room, { reset: true });
    else if (room.autoMove) armTurnTimer(room, { reset: true });
    else room.turnEndsAt = null;
  }
  touch(room);
  return null;
}

export function assignMissingAvatars(room: Room) {
  for (const seat of room.seats) {
    if (seat.avatar) continue;
    const next = unusedAvatar(room.seats.map((item) => item.avatar));
    if (!next) break;
    seat.avatar = next;
  }
}

export function setSeatAvatar(room: Room, playerId: string, avatar: string): string | null {
  const seat = seatById(room, playerId);
  if (!seat || seat.isBot) return null;
  if (!isAvatarId(avatar)) return "Unknown avatar.";
  if (room.seats.some((other) => other.id !== playerId && other.avatar === avatar)) {
    return "That avatar is already taken.";
  }
  if (seat.avatar === avatar) return null;
  seat.avatar = avatar;
  touch(room);
  return null;
}

export function renameSeat(room: Room, playerId: string, name: string) {
  const seat = seatById(room, playerId);
  if (!seat || seat.isBot) return;
  const trimmed = name.trim().slice(0, 24);
  if (!trimmed) return;
  seat.name = uniqueName(
    { ...room, seats: room.seats.filter((item) => item.id !== playerId) },
    trimmed,
  );
  seat.mailboxHandle = normalizeHandle(seat.name);
  touch(room);
}

export function maybeAct(room: Room, now = Date.now()): boolean {
  try {
    if (room.phase === "round_end" && room.autoNextAt && now >= room.autoNextAt) {
      nextRound(room);
      return true;
    }
    if (room.phase !== "playing" || !room.currentSeatId) return false;
    const seat = seatById(room, room.currentSeatId);
    if (!seat) return false;
    if (!usesBotBrain(seat) && !room.autoMove) return false;
    const due = room.turnEndsAt ?? now;
    if (now < due) return false;
    const standIn = seat.botPlay && !seat.isBot;
    const wasHuman = !seat.isBot && !standIn;
    const idleName = seat.name;
    playBotTurn(room, seat);
    if (standIn) {
      room.message = `Auto-play moved for ${idleName}.`;
    } else if (wasHuman) {
      room.message = `${idleName} was idle — the table made a legal move.`;
    }
    return true;
  } catch (err) {
    console.error("maybeAct failed", room.code, err);
    return false;
  }
}

export function playBotTurn(room: Room, seat: Seat) {
  try {
    const wild = wildRankForRound(room.round);
    if (room.turnPhase === "draw") {
      const choice = chooseDraw(
        seat.hand,
        room.discard.at(-1) ?? null,
        wild,
        room.acePoints,
        room.wildFaceValue,
      );
      if (choice === "discard" && room.discard.length > 0) {
        takeDiscard(room, seat.id);
      } else {
        const drew = drawStock(room, seat.id);
        if (drew && room.phase === "playing" && room.turnPhase === "draw" && room.discard.length > 0) {
          takeDiscard(room, seat.id);
        }
      }
    }
    if (room.phase === "playing" && room.currentSeatId === seat.id && room.turnPhase === "discard") {
      if (seat.hand.length === 0) return;
      const pick = chooseDiscard(seat.hand, wild, room.acePoints, room.wildFaceValue);
      if (!pick.cardId) return;
      if (pick.goOut) goOut(room, seat.id, pick.cardId);
      else discardCard(room, seat.id, pick.cardId);
    }
  } catch (err) {
    console.error("playBotTurn failed", room.code, seat.name, err);
  }
}

export function toClientView(room: Room, youId: string): ClientView {
  const you = seatById(room, youId);
  const wild = wildRankForRound(room.round);
  const current = room.currentSeatId ? seatById(room, room.currentSeatId) : undefined;
  const dealer = room.dealerId ? seatById(room, room.dealerId) : undefined;
  const yourTurn = room.phase === "playing" && room.currentSeatId === youId;
  const showHands = room.phase === "round_end" || room.phase === "match_end";
  return {
    roomCode: room.code,
    youId,
    hostId: room.hostId,
    isHost: room.hostId === youId,
    seated: Boolean(you),
    phase: room.phase,
    round: room.round,
    dealCount: dealCountForRound(room.round),
    wildRank: wild,
    jokers: room.jokers,
    acePoints: room.acePoints,
    wildFaceValue: room.wildFaceValue,
    autoMove: room.autoMove,
    decks: deckCountForPlayers(Math.max(room.seats.length, 2)),
    dealerId: room.dealerId,
    dealerName: dealer?.name ?? null,
    currentPlayerId: room.currentSeatId,
    currentPlayerName: current?.name ?? null,
    players: room.seats.map((seat, index) => ({
      id: seat.id,
      name: seat.name,
      isBot: seat.isBot,
      botPlay: !seat.isBot && seat.botPlay,
      connected: seat.connected,
      seated: true,
      cardCount: seat.hand.length,
      score: seat.score,
      roundScores: seat.roundScores,
      isYou: seat.id === youId,
      avatar: seat.avatar,
      seatIndex: index,
      mailboxId: seat.mailboxId,
      mailboxHandle: seat.mailboxHandle,
      goldGlow: !seat.isBot && !seatLearningMatch(seat) && goldGlowFor(seat.name),
      learning: seatIsLearning(seat),
      learningMatch: seatLearningMatch(seat),
    })),
    stockCount: room.stock.length,
    discardTop: room.discard.at(-1) ?? null,
    discardCount: room.discard.length,
    scoopedDiscard: room.scoopedDiscard,
    yourHand: you?.hand ?? [],
    turnPhase: yourTurn ? room.turnPhase : null,
    yourTurn,
    goOutCardIds: you && yourTurn && room.turnPhase === "discard" ? goOutCardIds(you.hand, wild, room.acePoints, room.wildFaceValue) : [],
    wentOutId: room.wentOutId,
    wentOutName: room.wentOutId ? seatById(room, room.wentOutId)?.name ?? null : null,
    lastTurnNames: room.lastTurnQueue
      .map((id) => seatById(room, id)?.name)
      .filter((name): name is string => Boolean(name)),
    message: room.message,
    joinPath: `/?room=${encodeURIComponent(room.code)}`,
    winnerIds: room.winnerIds,
    revealed: showHands ? room.revealed : undefined,
    turnEndsAt: room.turnEndsAt,
    autoNextAt: room.autoNextAt,
    createdAt: room.createdAt,
    donateUrl: donateUrlFromEnv(),
    discordVoiceUrl: discordVoiceUrlFromEnv(),
    wagerRules: room.wagerRules,
    wagerStake: room.wagerStake,
    wagerStakePath: [...room.wagerStakePath],
    wagerSuddenDeath: room.wagerSuddenDeath,
    wagerSuddenDeathHands: room.wagerSuddenDeathHands,
    wagerSettlement: room.wagerSettlement,
    sitStats: listSitStats(),
    sitGlobal: listSitGlobal(),
  };
}

export function isRoomExpired(room: Room, now = Date.now()): boolean {
  return now - room.updatedAt > ROOM_IDLE_MS;
}

export function deckSummary(playerCount: number, jokers: boolean): string {
  const decks = deckCountForPlayers(Math.max(playerCount, 2));
  const extras = jokers ? ` + ${decks * 2} jokers` : " (no jokers)";
  return `${Math.max(playerCount, 2)} players → ${decks}×52${extras} = ${decks * 52 + (jokers ? decks * 2 : 0)} cards. Wilds = round rank.`;
}
