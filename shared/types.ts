import type { ChatMessage } from "./chat.js";
import type { SitGlobalBoard, SitStatsView } from "./mailboxStats.js";
import type { WagerSettlement } from "./wager.js";

export type Suit = "S" | "H" | "D" | "C";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  id: string;
  suit: Suit | "J";
  rank: Rank | 0;
}

export type Phase = "lobby" | "playing" | "round_end" | "match_end";
export type TurnPhase = "draw" | "discard";

export interface PublicPlayer {
  id: string;
  name: string;
  isBot: boolean;
  botPlay: boolean;
  connected: boolean;
  seated: boolean;
  cardCount: number;
  score: number;
  roundScores: number[];
  isYou: boolean;
  avatar: string | null;
  seatIndex: number;
  mailboxId?: string | null;
  mailboxHandle?: string | null;
  goldGlow: boolean;
  learning: boolean;
  learningMatch: boolean;
}

export interface RevealedHand {
  playerId: string;
  name: string;
  melds: Card[][];
  deadwood: Card[];
  roundPoints: number;
}

export interface ClientView {
  roomCode: string;
  youId: string;
  hostId: string | null;
  isHost: boolean;
  seated: boolean;
  phase: Phase;
  round: number;
  dealCount: number;
  wildRank: number;
  jokers: boolean;
  acePoints: 1 | 15;
  wildFaceValue: boolean;
  autoMove: boolean;
  decks: number;
  dealerId: string | null;
  dealerName: string | null;
  currentPlayerId: string | null;
  currentPlayerName: string | null;
  players: PublicPlayer[];
  stockCount: number;
  discardTop: Card | null;
  discardCount: number;
  scoopedDiscard: Card | null;
  yourHand: Card[];
  turnPhase: TurnPhase | null;
  yourTurn: boolean;
  goOutCardIds: string[];
  wentOutId: string | null;
  wentOutName: string | null;
  lastTurnNames: string[];
  message: string;
  joinPath: string;
  winnerIds: string[];
  revealed?: RevealedHand[];
  turnEndsAt: number | null;
  autoNextAt: number | null;
  createdAt: number;
  donateUrl: string;
  discordVoiceUrl: string;
  wagerRules: boolean;
  wagerStake: number;
  wagerStakePath: number[];
  wagerSuddenDeath: boolean;
  wagerSuddenDeathHands: number;
  wagerSettlement: WagerSettlement | null;
  sitStats: SitStatsView[];
  sitGlobal: SitGlobalBoard;
}

export type ClientMessage =
  | { type: "hello"; playerId: string; name?: string; avatar?: string; learning?: boolean }
  | { type: "join"; roomCode: string }
  | { type: "newRoom" }
  | { type: "setName"; name: string }
  | { type: "sit"; name: string; avatar?: string; learning?: boolean }
  | { type: "setLearning"; learning: boolean }
  | { type: "setAvatar"; avatar: string }
  | { type: "stand" }
  | { type: "addBot"; name?: string }
  | { type: "removePlayer"; playerId: string }
  | { type: "setJokers"; jokers: boolean }
  | { type: "setAcePoints"; acePoints: 1 | 15 }
  | { type: "setWildFaceValue"; wildFaceValue: boolean }
  | { type: "setAutoMove"; autoMove: boolean }
  | { type: "setWagerRules"; wagerRules: boolean }
  | { type: "setWagerStake"; stake: number }
  | { type: "rollDealer" }
  | { type: "startGame" }
  | { type: "drawStock" }
  | { type: "takeDiscard" }
  | { type: "discard"; cardId: string }
  | { type: "goOut"; cardId: string }
  | { type: "nextRound" }
  | { type: "rematch" }
  | { type: "endGame" }
  | { type: "setBotPlay"; playerId: string; on: boolean }
  | { type: "forgetSitStats"; handle: string; what: "worst" | "all" | "restoreWorst" }
  | { type: "chat"; text: string; name?: string };

export type ServerMessage =
  | { type: "state"; state: ClientView }
  | { type: "error"; message: string }
  | { type: "hello-ok"; playerId: string; roomCode: string; createdAt: number; resumed: boolean }
  | { type: "chat"; messages: ChatMessage[] }
  | { type: "chat-append"; message: ChatMessage };
