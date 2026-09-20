import { ROUND_COUNT } from "./cards.js";

/** Case-insensitive sit-name key. "Dad" and "dad" are the same mailbox. */
export function normalizeHandle(raw: string | null | undefined): string | null {
  const handle = raw?.trim().toLowerCase() ?? "";
  return handle || null;
}

export interface MailboxRef {
  mailboxId: string | null;
  mailboxHandle: string | null;
}

export interface MatchPlayerRecord extends MailboxRef {
  seatId: string;
  name: string;
  score: number;
  won: boolean;
  firstOutCount: number;
  wentOutRounds: number[];
  starVictim: boolean;
  chipDelta: number;
}

export interface MatchRecord {
  roomCode: string;
  endedAt: number;
  wager: boolean;
  stake: number;
  stakePath: number[];
  suddenDeathHands: number;
  perfectSweep: boolean;
  sweeperId: string | null;
  winnerIds: string[];
  players: MatchPlayerRecord[];
}

export interface MailboxStats extends MailboxRef {
  displayName: string;
  wins: number;
  losses: number;
  bestScore: number | null;
  bestScoreAt: number | null;
  /** Highest final total among losses only. Null until they lose a match. */
  worstScore: number | null;
  worstScoreAt: number | null;
  firstOutStars: number;
  perfectSweeps: number;
  chips: number;
}

export interface SitHeldRecord {
  displayName: string;
  score: number;
  recordedAt: number;
}

export interface SitStatsView {
  handle: string;
  displayName: string;
  wins: number;
  losses: number;
  bestScore: number | null;
  bestScoreAt: number | null;
  worstLoss: number | null;
  worstLossAt: number | null;
  firstOutStars: number;
  perfectSweeps: number;
  goldGlow: boolean;
  previousBest: SitHeldRecord | null;
  previousWorst: SitHeldRecord | null;
}

export function emptyMailboxStats(ref: MailboxRef, displayName = ""): MailboxStats {
  const handle = normalizeHandle(ref.mailboxHandle);
  return {
    mailboxId: ref.mailboxId,
    mailboxHandle: handle,
    displayName: displayName.trim() || handle || "",
    wins: 0,
    losses: 0,
    bestScore: null,
    bestScoreAt: null,
    worstScore: null,
    worstScoreAt: null,
    firstOutStars: 0,
    perfectSweeps: 0,
    chips: 0,
  };
}

/**
 * Apply one finished match.
 * Best = lowest final total (any match). Worst = highest final among losses only.
 * A perfect sweep (first-out all 11 regulation hands) is permanent, win or lose.
 */
export function applyMatchToMailbox(stats: MailboxStats, player: MatchPlayerRecord, match: MatchRecord): MailboxStats {
  const next = { ...stats };
  if (player.name.trim()) next.displayName = player.name.trim();
  if (player.won) next.wins += 1;
  else next.losses += 1;
  if (next.bestScore == null || player.score < next.bestScore) {
    next.bestScore = player.score;
    next.bestScoreAt = match.endedAt;
  }
  if (!player.won && (next.worstScore == null || player.score > next.worstScore)) {
    next.worstScore = player.score;
    next.worstScoreAt = match.endedAt;
  }
  next.firstOutStars += player.firstOutCount;
  if (match.perfectSweep && player.firstOutCount >= ROUND_COUNT) {
    next.perfectSweeps += 1;
  }
  next.chips += player.chipDelta;
  return next;
}

/** Prior best/worst when a new score overwrites the live record. */
export function sitRecordArchives(prev: MailboxStats, next: MailboxStats): SitHeldRecord[] {
  const out: SitHeldRecord[] = [];
  if (
    prev.bestScore != null &&
    prev.bestScoreAt != null &&
    next.bestScore != null &&
    (next.bestScore !== prev.bestScore || next.bestScoreAt !== prev.bestScoreAt)
  ) {
    out.push({ displayName: prev.displayName || next.displayName, score: prev.bestScore, recordedAt: prev.bestScoreAt });
  }
  return out;
}

export function sitWorstArchives(prev: MailboxStats, next: MailboxStats): SitHeldRecord[] {
  const out: SitHeldRecord[] = [];
  if (
    prev.worstScore != null &&
    prev.worstScoreAt != null &&
    next.worstScore != null &&
    (next.worstScore !== prev.worstScore || next.worstScoreAt !== prev.worstScoreAt)
  ) {
    out.push({ displayName: prev.displayName || next.displayName, score: prev.worstScore, recordedAt: prev.worstScoreAt });
  }
  return out;
}

export function toSitStatsView(
  stats: MailboxStats,
  extras?: { previousBest?: SitHeldRecord | null; previousWorst?: SitHeldRecord | null },
): SitStatsView {
  const handle = stats.mailboxHandle ?? "";
  return {
    handle,
    displayName: stats.displayName || handle,
    wins: stats.wins,
    losses: stats.losses,
    bestScore: stats.bestScore,
    bestScoreAt: stats.bestScoreAt,
    worstLoss: stats.worstScore,
    worstLossAt: stats.worstScoreAt,
    firstOutStars: stats.firstOutStars,
    perfectSweeps: stats.perfectSweeps,
    goldGlow: stats.perfectSweeps > 0,
    previousBest: extras?.previousBest ?? null,
    previousWorst: extras?.previousWorst ?? null,
  };
}

export function formatSitDate(at: number | null | undefined): string | null {
  if (at == null) return null;
  return new Date(at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Immortal hall-of-fame / hall-of-shame line. Survives personal forget and wipe. */
export interface SitGlobalRecord {
  handle: string;
  displayName: string;
  score: number;
  recordedAt: number;
}

export interface SitGlobalBoard {
  best: SitGlobalRecord | null;
  worst: SitGlobalRecord | null;
}

/** Comedy score line. The Hall of Fame “erase for a bigger tip” troll is parked — not in the UI. */
export function sitScoreLine(emoji: string, score: number | null, name: string, at: number | null | undefined): string {
  if (score == null) return "—";
  const when = formatSitDate(at);
  const whoWhen = [name, when].filter(Boolean).join(" · ");
  return whoWhen ? `${emoji} ${score} — ${whoWhen}` : `${emoji} ${score}`;
}

export function globalBestLine(record: SitGlobalRecord | null): string {
  if (!record) return "🥹 Global best — finish a match to write the first line.";
  return sitScoreLine("🥹", record.score, record.displayName, record.recordedAt);
}

export function globalWorstLine(record: SitGlobalRecord | null): string {
  if (!record) return "😭 Global worst — someone has to lose first.";
  return sitScoreLine("😭", record.score, record.displayName, record.recordedAt);
}

export function emptySitStatsView(handle: string, displayName: string): SitStatsView {
  return {
    handle,
    displayName,
    wins: 0,
    losses: 0,
    bestScore: null,
    bestScoreAt: null,
    worstLoss: null,
    worstLossAt: null,
    firstOutStars: 0,
    perfectSweeps: 0,
    goldGlow: false,
    previousBest: null,
    previousWorst: null,
  };
}

export function sitLeaderboard(rows: SitStatsView[]): SitStatsView[] {
  return [...rows].sort((a, b) => {
    const aPlayed = a.wins + a.losses;
    const bPlayed = b.wins + b.losses;
    if (aPlayed > 0 && bPlayed === 0) return -1;
    if (bPlayed > 0 && aPlayed === 0) return 1;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.firstOutStars !== a.firstOutStars) return b.firstOutStars - a.firstOutStars;
    const aBest = a.bestScore ?? Number.POSITIVE_INFINITY;
    const bBest = b.bestScore ?? Number.POSITIVE_INFINITY;
    if (aBest !== bBest) return aBest - bBest;
    return a.displayName.localeCompare(b.displayName);
  });
}

export function collectSitBoard(sitStats: SitStatsView[], seatedNames: string[]): SitStatsView[] {
  const byHandle = new Map<string, SitStatsView>();
  for (const row of sitStats) {
    if (!row.handle) continue;
    byHandle.set(row.handle, row);
  }
  for (const name of seatedNames) {
    const handle = normalizeHandle(name);
    if (!handle || byHandle.has(handle)) continue;
    byHandle.set(handle, emptySitStatsView(handle, name));
  }
  return sitLeaderboard([...byHandle.values()]);
}

export function filterSitBoard(rows: SitStatsView[], query: string): SitStatsView[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => row.displayName.toLowerCase().includes(q) || row.handle.includes(q));
}

const recentMatches: MatchRecord[] = [];

export function recordMatchOutcome(record: MatchRecord) {
  recentMatches.unshift(record);
  if (recentMatches.length > 40) recentMatches.pop();
}

export function recentMatchOutcomes(): readonly MatchRecord[] {
  return recentMatches;
}

export function clearRecentMatchOutcomes() {
  recentMatches.length = 0;
}
