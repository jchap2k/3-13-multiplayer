import { ArrowLeft, Star, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  collectSitBoard,
  filterSitBoard,
  globalBestLine,
  globalWorstLine,
  normalizeHandle,
  sitScoreLine,
  type SitGlobalBoard,
  type SitGlobalRecord,
  type SitStatsView,
} from "@shared/mailboxStats";
import { forgetTipUrl } from "@shared/donate";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

function emptyCopy(query: string) {
  if (!query.trim()) {
    return "Join under a name and finish a match. Bots are not counted.";
  }
  return `No stats yet for “${query.trim()}”. Join under that name and finish a match — bots are not counted.`;
}

function Stars({ count }: { count: number }) {
  if (count <= 0) return <span className="text-emerald-100/45">None yet</span>;
  if (count <= 11) {
    return (
      <span className="tracking-tight text-amber-200" aria-label={`${count} first-out stars`}>
        {"★".repeat(count)}
        <span className="ml-1.5 text-xs font-semibold text-amber-100/80">{count}</span>
      </span>
    );
  }
  return <span className="font-semibold text-amber-200">★ {count}</span>;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/70">{label}</p>
      <p className="mt-1 font-display text-xl font-extrabold leading-snug text-white sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-emerald-100/55">{hint}</p> : null}
    </div>
  );
}

function HallCard({ kind, record }: { kind: "best" | "worst"; record: SitGlobalRecord | null }) {
  const fame = kind === "best";
  const line = fame ? globalBestLine(record) : globalWorstLine(record);
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3",
        fame ? "border-amber-200/30 bg-amber-950/25" : "border-rose-200/25 bg-rose-950/20",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/70">
        {fame ? "Hall of Fame · global best" : "Hall of Shame · global worst"}
      </p>
      <p className="mt-1 font-display text-lg font-extrabold leading-snug text-white sm:text-xl">{line}</p>
      <p className="mt-1 text-xs text-emerald-100/55">
        Immortal. A personal tip-forget only clears that sit-name’s card.
      </p>
    </div>
  );
}

function PersonCard({
  selected,
  isHost,
  seated,
  donateUrl,
  onForget,
  onBack,
}: {
  selected: SitStatsView;
  isHost: boolean;
  seated: boolean;
  donateUrl?: string | null;
  onForget?: (handle: string, what: "worst" | "all" | "restoreWorst") => void;
  onBack: () => void;
}) {
  const [tipPending, setTipPending] = useState(false);
  const played = selected.wins + selected.losses > 0;

  function openTipJar() {
    window.open(forgetTipUrl(donateUrl), "_blank", "noopener,noreferrer");
    setTipPending(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack} aria-label="Back to sit-name list">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={`font-display text-3xl font-extrabold ${selected.goldGlow ? "sit-name-gold" : "text-white"}`}>
          {selected.displayName}
        </h3>
        {selected.goldGlow ? (
          <span className="sit-sweep-badge">
            <Trophy className="h-3.5 w-3.5" />
            Perfect sweep
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCard
          label="Record"
          value={played ? `${selected.wins}–${selected.losses}` : "—"}
          hint={played ? "Match wins–losses" : "No finished match yet"}
        />
        <StatCard
          label="Best"
          value={sitScoreLine("🥹", selected.bestScore, selected.displayName, selected.bestScoreAt)}
          hint={
            selected.previousBest
              ? `Earlier: ${sitScoreLine("🥹", selected.previousBest.score, selected.previousBest.displayName, selected.previousBest.recordedAt)}`
              : "Lowest final total, any match"
          }
        />
        <StatCard
          label="Worst loss"
          value={sitScoreLine("😭", selected.worstLoss, selected.displayName, selected.worstLossAt)}
          hint={
            selected.previousWorst
              ? `Earlier: ${sitScoreLine("😭", selected.previousWorst.score, selected.previousWorst.displayName, selected.previousWorst.recordedAt)}`
              : "Highest final among losses only"
          }
        />
        <div className="col-span-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-3 sm:col-span-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/70">
            <Star className="h-3.5 w-3.5" />
            First-out stars
          </p>
          <p className="mt-2 text-lg">
            <Stars count={selected.firstOutStars} />
          </p>
          <p className="mt-1 text-xs text-emerald-100/50">
            One star per hand they went out first. Gold glow is only for a full 11-hand sweep — first
            out every regulation deal (3 through 13). Partial stars stay plain.
          </p>
        </div>
      </div>
      {selected.worstLoss == null && played ? (
        <p className="text-xs text-emerald-100/50">Worst waits for a loss. A win never sets the worst score.</p>
      ) : null}
      <div className="rounded-2xl border border-amber-200/25 bg-amber-950/30 px-3 py-3">
        <p className="text-sm font-semibold text-amber-100">Forget this for a tip 😅</p>
        <p className="mt-1 text-xs text-emerald-100/60">
          Thick skin is the default. If a 😭 night should leave this card, open Stripe, tip what you
          want (same Payment Link as Support hosting), then tap I tipped. Honor system for now — no
          webhook. The Hall of Fame / Hall of Shame lines on the board stay anyway.
        </p>
        {!tipPending ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selected.worstLoss != null || played ? (
              <button
                type="button"
                className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-[#3b2200] hover:bg-amber-300"
                onClick={openTipJar}
              >
                Forget this for a tip 😅
              </button>
            ) : null}
            {isHost && onForget && selected.previousWorst && selected.worstLoss == null ? (
              <button
                type="button"
                className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                onClick={() => onForget(selected.handle, "restoreWorst")}
              >
                Bring back last worst
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-amber-100/80">
              Stripe is open in another tab. After you tip (or if you already did), confirm below. Sit
              down first if the buttons are quiet.
            </p>
            <div className="flex flex-wrap gap-2">
              {selected.worstLoss != null ? (
                <button
                  type="button"
                  className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-[#3b2200] hover:bg-amber-300 disabled:opacity-45"
                  disabled={!seated || !onForget}
                  onClick={() => {
                    onForget?.(selected.handle, "worst");
                    setTipPending(false);
                  }}
                >
                  I tipped — forget this worst 😭
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-full border border-red-300/40 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-900/40 disabled:opacity-45"
                disabled={!seated || !onForget}
                onClick={() => {
                  if (
                    window.confirm(
                      `Wipe all stats for ${selected.displayName}? They start fresh next match. Earlier scores stay archived. Hall of Fame / Shame stay.`,
                    )
                  ) {
                    onForget?.(selected.handle, "all");
                    setTipPending(false);
                    onBack();
                  }
                }}
              >
                I tipped — wipe this name
              </button>
              <button
                type="button"
                className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                onClick={() => setTipPending(false)}
              >
                Keep the 😭
              </button>
            </div>
            {!seated ? <p className="text-xs text-emerald-100/50">Join to confirm a tip-forget.</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatsBoard({
  sitStats,
  sitGlobal,
  seatedNames,
  initialName,
  openNonce = 0,
  isHost = false,
  seated = false,
  donateUrl,
  onForget,
  onBack,
}: {
  sitStats: SitStatsView[];
  sitGlobal?: SitGlobalBoard;
  seatedNames: string[];
  initialName?: string;
  openNonce?: number;
  isHost?: boolean;
  seated?: boolean;
  donateUrl?: string | null;
  onForget?: (handle: string, what: "worst" | "all" | "restoreWorst") => void;
  onBack?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);

  useEffect(() => {
    if (openNonce === 0 && !initialName) return;
    if (initialName) {
      setQuery("");
      setSelectedHandle(normalizeHandle(initialName));
    } else {
      setQuery("");
      setSelectedHandle(null);
    }
  }, [initialName, openNonce]);

  const board = useMemo(() => collectSitBoard(sitStats, seatedNames), [seatedNames, sitStats]);
  const visible = useMemo(() => filterSitBoard(board, query), [board, query]);
  const selected = selectedHandle ? board.find((row) => row.handle === selectedHandle) ?? null : null;
  const halls = sitGlobal ?? { best: null, worst: null };

  useEffect(() => {
    if (selectedHandle && !board.some((row) => row.handle === selectedHandle)) {
      setSelectedHandle(null);
    }
  }, [board, selectedHandle]);

  function goBack() {
    setSelectedHandle(null);
    setQuery("");
    onBack?.();
  }

  if (selected) {
    return (
      <PersonCard
        selected={selected}
        isHost={isHost}
        seated={seated}
        donateUrl={donateUrl}
        onForget={onForget}
        onBack={goBack}
      />
    );
  }

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        <HallCard kind="best" record={halls.best} />
        <HallCard kind="worst" record={halls.worst} />
      </div>
      <Input
        className="mt-4"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter sit names"
        aria-label="Filter sit names"
      />
      {visible.length > 0 ? (
        <ul className="mt-2 max-h-[min(28rem,60vh)] overflow-auto rounded-2xl border border-white/10 bg-black/20">
          {visible.map((row) => {
            const played = row.wins + row.losses > 0;
            return (
              <li key={row.handle} className="border-b border-white/5 last:border-b-0">
                <button
                  type="button"
                  className="flex w-full flex-col gap-1 px-3 py-2.5 text-left hover:bg-white/5"
                  onClick={() => setSelectedHandle(row.handle)}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className={`font-semibold ${row.goldGlow ? "sit-name-gold" : "text-white"}`}>
                      {row.displayName}
                      {row.goldGlow ? (
                        <span className="ml-2 align-middle text-[10px] font-extrabold uppercase tracking-wide text-amber-200">
                          Sweep
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-emerald-100/80">
                      {played ? `${row.wins}–${row.losses}` : "—"}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-emerald-100/70">
                    <span>{sitScoreLine("🥹", row.bestScore, row.displayName, row.bestScoreAt)}</span>
                    <span>{sitScoreLine("😭", row.worstLoss, row.displayName, row.worstLossAt)}</span>
                    <span>
                      {row.firstOutStars > 0 ? `★ ${row.firstOutStars}` : "★ none yet"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-2 rounded-2xl border border-dashed border-white/15 bg-black/15 px-4 py-6 text-sm text-emerald-100/65">
          {board.length === 0 ? emptyCopy("") : emptyCopy(query)}
        </div>
      )}
    </div>
  );
}

export function scrollToStats() {
  document.getElementById("stats")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
