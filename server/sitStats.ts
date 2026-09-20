import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  applyMatchToMailbox,
  emptyMailboxStats,
  normalizeHandle,
  sitRecordArchives,
  sitWorstArchives,
  toSitStatsView,
  type MailboxStats,
  type MatchRecord,
  type SitGlobalBoard,
  type SitGlobalRecord,
  type SitHeldRecord,
  type SitStatsView,
} from "../shared/mailboxStats.js";

let db: DatabaseSync | null = null;

export function sitStatsDbPath(): string {
  if (process.env.SIT_STATS_DB) return process.env.SIT_STATS_DB;
  if (process.env.VITEST === "true") return ":memory:";
  if (existsSync("/data")) return "/data/sit-stats.sqlite";
  return path.resolve(process.cwd(), "data/sit-stats.sqlite");
}

function openDb(): DatabaseSync {
  if (db) return db;
  const file = sitStatsDbPath();
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  migrate(db);
  importLegacyJson(db);
  return db;
}

function migrate(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sit_stats (
      handle TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      mailbox_id TEXT,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      best_score INTEGER,
      best_score_at INTEGER,
      worst_score INTEGER,
      worst_score_at INTEGER,
      first_out_stars INTEGER NOT NULL DEFAULT 0,
      perfect_sweeps INTEGER NOT NULL DEFAULT 0,
      chips INTEGER NOT NULL DEFAULT 0,
      deleted_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sit_record_archive (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      handle TEXT NOT NULL,
      kind TEXT NOT NULL,
      display_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      recorded_at INTEGER NOT NULL,
      beaten_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sit_global_record (
      kind TEXT PRIMARY KEY,
      handle TEXT NOT NULL,
      display_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      recorded_at INTEGER NOT NULL
    );
  `);
  backfillGlobals(database);
}

function importLegacyJson(database: DatabaseSync) {
  const count = database.prepare("SELECT COUNT(*) AS n FROM sit_stats").get() as { n: number };
  if (count.n > 0) return;
  const jsonPath = process.env.SIT_STATS_PATH || path.resolve(process.cwd(), "data/sit-stats.json");
  try {
    const rows = JSON.parse(readFileSync(jsonPath, "utf8")) as MailboxStats[];
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      const handle = normalizeHandle(row.mailboxHandle);
      if (!handle) continue;
      upsertStats(database, { ...emptyMailboxStats(row, row.displayName), ...row, mailboxHandle: handle });
    }
  } catch {
    /* no legacy file */
  }
}

function rowToStats(row: Record<string, unknown>): MailboxStats {
  return {
    mailboxId: (row.mailbox_id as string | null) ?? null,
    mailboxHandle: String(row.handle),
    displayName: String(row.display_name),
    wins: Number(row.wins),
    losses: Number(row.losses),
    bestScore: row.best_score == null ? null : Number(row.best_score),
    bestScoreAt: row.best_score_at == null ? null : Number(row.best_score_at),
    worstScore: row.worst_score == null ? null : Number(row.worst_score),
    worstScoreAt: row.worst_score_at == null ? null : Number(row.worst_score_at),
    firstOutStars: Number(row.first_out_stars),
    perfectSweeps: Number(row.perfect_sweeps),
    chips: Number(row.chips),
  };
}

function readRow(
  database: DatabaseSync,
  handle: string,
): { stats: MailboxStats; deleted: boolean } | null {
  const row = database.prepare("SELECT * FROM sit_stats WHERE handle = ?").get(handle) as
    | (Record<string, unknown> & { deleted_at: number | null })
    | undefined;
  if (!row) return null;
  return { stats: rowToStats(row), deleted: row.deleted_at != null };
}

function readStats(database: DatabaseSync, handle: string): MailboxStats | null {
  const row = readRow(database, handle);
  if (!row || row.deleted) return null;
  return row.stats;
}

function upsertStats(database: DatabaseSync, stats: MailboxStats, deletedAt: number | null = null) {
  const handle = stats.mailboxHandle;
  if (!handle) return;
  database
    .prepare(
      `INSERT INTO sit_stats (
        handle, display_name, mailbox_id, wins, losses, best_score, best_score_at,
        worst_score, worst_score_at, first_out_stars, perfect_sweeps, chips, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(handle) DO UPDATE SET
        display_name = excluded.display_name,
        mailbox_id = excluded.mailbox_id,
        wins = excluded.wins,
        losses = excluded.losses,
        best_score = excluded.best_score,
        best_score_at = excluded.best_score_at,
        worst_score = excluded.worst_score,
        worst_score_at = excluded.worst_score_at,
        first_out_stars = excluded.first_out_stars,
        perfect_sweeps = excluded.perfect_sweeps,
        chips = excluded.chips,
        deleted_at = excluded.deleted_at`,
    )
    .run(
      handle,
      stats.displayName,
      stats.mailboxId,
      stats.wins,
      stats.losses,
      stats.bestScore,
      stats.bestScoreAt,
      stats.worstScore,
      stats.worstScoreAt,
      stats.firstOutStars,
      stats.perfectSweeps,
      stats.chips,
      deletedAt,
    );
}

function archiveRecords(
  database: DatabaseSync,
  handle: string,
  kind: "best" | "worst",
  records: SitHeldRecord[],
  beatenAt: number,
) {
  const insert = database.prepare(
    `INSERT INTO sit_record_archive (handle, kind, display_name, score, recorded_at, beaten_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const record of records) {
    insert.run(handle, kind, record.displayName, record.score, record.recordedAt, beatenAt);
  }
}

function readGlobal(database: DatabaseSync, kind: "best" | "worst"): SitGlobalRecord | null {
  const row = database
    .prepare(`SELECT handle, display_name, score, recorded_at FROM sit_global_record WHERE kind = ?`)
    .get(kind) as { handle: string; display_name: string; score: number; recorded_at: number } | undefined;
  if (!row) return null;
  return {
    handle: row.handle,
    displayName: row.display_name,
    score: row.score,
    recordedAt: row.recorded_at,
  };
}

/** Lowest final (best) or highest loss (worst) ever. Never cleared by personal forget/wipe. */
function considerGlobal(
  database: DatabaseSync,
  kind: "best" | "worst",
  handle: string,
  displayName: string,
  score: number,
  recordedAt: number,
) {
  const current = readGlobal(database, kind);
  const beats =
    !current || (kind === "best" ? score < current.score : score > current.score);
  if (!beats) return;
  database
    .prepare(
      `INSERT INTO sit_global_record (kind, handle, display_name, score, recorded_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(kind) DO UPDATE SET
         handle = excluded.handle,
         display_name = excluded.display_name,
         score = excluded.score,
         recorded_at = excluded.recorded_at`,
    )
    .run(kind, handle, displayName, score, recordedAt);
}

function backfillGlobals(database: DatabaseSync) {
  const count = database.prepare("SELECT COUNT(*) AS n FROM sit_global_record").get() as { n: number };
  if (count.n > 0) return;
  const rows = database
    .prepare(
      `SELECT handle, display_name, best_score, best_score_at, worst_score, worst_score_at FROM sit_stats`,
    )
    .all() as {
    handle: string;
    display_name: string;
    best_score: number | null;
    best_score_at: number | null;
    worst_score: number | null;
    worst_score_at: number | null;
  }[];
  for (const row of rows) {
    if (row.best_score != null && row.best_score_at != null) {
      considerGlobal(database, "best", row.handle, row.display_name, row.best_score, row.best_score_at);
    }
    if (row.worst_score != null && row.worst_score_at != null) {
      considerGlobal(database, "worst", row.handle, row.display_name, row.worst_score, row.worst_score_at);
    }
  }
  const archives = database
    .prepare(`SELECT handle, kind, display_name, score, recorded_at FROM sit_record_archive`)
    .all() as {
    handle: string;
    kind: string;
    display_name: string;
    score: number;
    recorded_at: number;
  }[];
  for (const row of archives) {
    if (row.kind !== "best" && row.kind !== "worst") continue;
    considerGlobal(database, row.kind, row.handle, row.display_name, row.score, row.recorded_at);
  }
}

function latestArchive(database: DatabaseSync, handle: string, kind: "best" | "worst"): SitHeldRecord | null {
  const row = database
    .prepare(
      `SELECT display_name, score, recorded_at FROM sit_record_archive
       WHERE handle = ? AND kind = ? ORDER BY id DESC LIMIT 1`,
    )
    .get(handle, kind) as { display_name: string; score: number; recorded_at: number } | undefined;
  if (!row) return null;
  return { displayName: row.display_name, score: row.score, recordedAt: row.recorded_at };
}

export function loadSitStats() {
  openDb();
}

/** Humans only. Bots and learning/tutorial seats never write sit-name rows. */
export function ingestHumanSitStats(record: MatchRecord, botSeatIds: Iterable<string>) {
  const database = openDb();
  const bots = new Set(botSeatIds);
  for (const player of record.players) {
    if (bots.has(player.seatId)) continue;
    const handle = normalizeHandle(player.mailboxHandle ?? player.name);
    if (!handle) continue;
    const existing = readRow(database, handle);
    const prev =
      existing && !existing.deleted
        ? existing.stats
        : emptyMailboxStats({ mailboxId: null, mailboxHandle: handle }, player.name);
    const next = applyMatchToMailbox(prev, { ...player, mailboxHandle: handle }, record);
    archiveRecords(database, handle, "best", sitRecordArchives(prev, next), record.endedAt);
    archiveRecords(database, handle, "worst", sitWorstArchives(prev, next), record.endedAt);
    upsertStats(database, next, null);
    considerGlobal(database, "best", handle, next.displayName, player.score, record.endedAt);
    if (!player.won) {
      considerGlobal(database, "worst", handle, next.displayName, player.score, record.endedAt);
    }
  }
}

export function listSitGlobal(): SitGlobalBoard {
  const database = openDb();
  return {
    best: readGlobal(database, "best"),
    worst: readGlobal(database, "worst"),
  };
}

export function listSitStats(): SitStatsView[] {
  const database = openDb();
  const rows = database.prepare("SELECT * FROM sit_stats WHERE deleted_at IS NULL").all() as Record<string, unknown>[];
  return rows
    .map((row) => {
      const stats = rowToStats(row);
      const handle = stats.mailboxHandle ?? "";
      return toSitStatsView(stats, {
        previousBest: latestArchive(database, handle, "best"),
        previousWorst: latestArchive(database, handle, "worst"),
      });
    })
    .filter((row) => row.handle)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function goldGlowFor(name: string | null | undefined): boolean {
  const handle = normalizeHandle(name);
  if (!handle) return false;
  const stats = readStats(openDb(), handle);
  return (stats?.perfectSweeps ?? 0) > 0;
}

export function forgetSitWorst(rawHandle: string): string | null {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return "Need a sit name to forget.";
  const database = openDb();
  const stats = readStats(database, handle);
  if (!stats) return "No stats for that name.";
  if (stats.worstScore == null || stats.worstScoreAt == null) return "That name has no worst on the board.";
  archiveRecords(
    database,
    handle,
    "worst",
    [{ displayName: stats.displayName, score: stats.worstScore, recordedAt: stats.worstScoreAt }],
    Date.now(),
  );
  upsertStats(database, { ...stats, worstScore: null, worstScoreAt: null });
  return null;
}

export function restoreSitWorst(rawHandle: string): string | null {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return "Need a sit name to restore.";
  const database = openDb();
  const stats = readStats(database, handle);
  if (!stats) return "No stats for that name.";
  if (stats.worstScore != null) return "That name already has a worst on the board.";
  const previous = latestArchive(database, handle, "worst");
  if (!previous) return "Nothing to bring back.";
  upsertStats(database, { ...stats, worstScore: previous.score, worstScoreAt: previous.recordedAt });
  return null;
}

export function wipeSitStats(rawHandle: string): string | null {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return "Need a sit name to wipe.";
  const database = openDb();
  const stats = readStats(database, handle);
  if (!stats) return "No stats for that name.";
  const now = Date.now();
  if (stats.bestScore != null && stats.bestScoreAt != null) {
    archiveRecords(
      database,
      handle,
      "best",
      [{ displayName: stats.displayName, score: stats.bestScore, recordedAt: stats.bestScoreAt }],
      now,
    );
  }
  if (stats.worstScore != null && stats.worstScoreAt != null) {
    archiveRecords(
      database,
      handle,
      "worst",
      [{ displayName: stats.displayName, score: stats.worstScore, recordedAt: stats.worstScoreAt }],
      now,
    );
  }
  upsertStats(database, stats, now);
  return null;
}

export function resetSitStatsForTest() {
  try {
    db?.close();
  } catch {
    /* already closed */
  }
  db = new DatabaseSync(":memory:");
  migrate(db);
}
