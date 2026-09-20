import { isRed, isWild, rankLabel, ROUND_COUNT, SUIT_GLYPH, wildSpoken } from "@shared/cards";
import {
  lastRoundPoints,
  placeLabel,
  rankStandings,
  revealedFor,
  scoreRoundLabel,
  scoredRoundCount,
  secondsUntil,
} from "@shared/scoreboard";
import type { Card, ClientView, RevealedHand } from "@shared/types";
import { formatPlayMoney, formatStakePath, wagerOweLine } from "@shared/wager";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { useA11y } from "../lib/A11yContext";
import { SeatAvatar } from "./SeatAvatar";
import { SitName, playerGold } from "./SitName";
import { DonateLink } from "./DonateLink";
import { Button } from "./ui/button";

function useSecondsLeft(at: number | null): number | null {
  const [left, setLeft] = useState(() => secondsUntil(at));
  useEffect(() => {
    const tick = () => setLeft(secondsUntil(at));
    tick();
    if (at == null) return;
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [at]);
  return left;
}

function CardChip({ card, wildRank }: { card: Card; wildRank: number }) {
  const { prefs } = useA11y();
  const red = isRed(card);
  const markWild = prefs.markWilds && isWild(card, wildRank);
  return (
    <span
      className={cn(
        "inline-flex min-w-[1.85rem] items-center justify-center rounded-md border bg-white px-1 py-0.5 text-xs font-bold",
        red ? "border-red-200 text-red-600" : "border-neutral-200 text-neutral-900",
        markWild ? "ring-1 ring-amber-400" : "",
      )}
    >
      {rankLabel(card.rank)}
      {SUIT_GLYPH[card.suit]}
    </span>
  );
}

function DeadwoodLine({
  row,
  wildRank,
}: {
  row: RevealedHand | undefined;
  wildRank: number;
}) {
  if (!row) return null;
  if (row.roundPoints === 0 && row.deadwood.length === 0) {
    return <p className="text-sm font-semibold text-amber-200">Clean — went out</p>;
  }
  if (row.deadwood.length === 0) {
    return <p className="text-sm text-emerald-100/70">No leftover cards</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-xs text-emerald-100/60">Deadwood</span>
      {row.deadwood.map((card) => (
        <CardChip key={card.id} card={card} wildRank={wildRank} />
      ))}
    </div>
  );
}

function RoundTable({
  players,
  rounds,
  wentOutId,
}: {
  players: ClientView["players"];
  rounds: number;
  wentOutId: string | null;
}) {
  const standings = rankStandings(players);
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/25">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-emerald-100/60">
            <th className="sticky left-0 bg-[#0c2419] px-3 py-2 font-semibold">Player</th>
            {Array.from({ length: rounds }, (_, i) => (
              <th key={i} className="px-2 py-2 text-center font-semibold">
                {scoreRoundLabel(i + 1)}
              </th>
            ))}
            <th className="px-3 py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((player) => (
            <tr
              key={player.id}
              className={cn(
                "border-b border-white/5",
                player.isYou ? "bg-amber-300/10" : "",
                wentOutId === player.id ? "bg-emerald-400/5" : "",
              )}
            >
              <th className="sticky left-0 bg-[#10281c] px-3 py-2 font-semibold text-white">
                <SitName name={player.name} goldGlow={playerGold(player)} />
                {player.isYou ? " · you" : ""}
                {wentOutId === player.id ? " · out" : ""}
              </th>
              {Array.from({ length: rounds }, (_, i) => (
                <td key={i} className="px-2 py-2 text-center tabular-nums text-emerald-50">
                  {player.roundScores[i] == null ? "—" : player.roundScores[i]}
                </td>
              ))}
              <td className="px-3 py-2 text-right text-base font-extrabold tabular-nums text-amber-100">
                {player.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LiveScores({ state }: { state: ClientView }) {
  const [open, setOpen] = useState(false);
  const rounds = scoredRoundCount(state.players, state.round);
  return (
    <section className="live-scores-card rounded-3xl border border-white/10 bg-black/30 p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">
            Scoreboard
          </p>
          <p className="live-scores-round font-display text-lg font-extrabold text-white sm:text-xl">
            {state.wagerSuddenDeath
              ? `Sudden death · deal ${state.dealCount}`
              : `Round ${state.round} of ${ROUND_COUNT}`}{" "}
            · {wildSpoken(state.wildRank)} wild
          </p>
          <p className="text-sm text-emerald-100/70">
            {state.wagerRules ? `Play money ${formatPlayMoney(state.wagerStake)}. ` : ""}
            {state.wentOutName
              ? `Last turns — ${state.wentOutName} went out`
              : state.currentPlayerName
                ? `${state.currentPlayerName}'s turn`
                : "Lowest total is winning"}
          </p>
        </div>
        {rounds > 0 ? (
          <Button size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
            {open ? "Hide rounds" : "All rounds"}
          </Button>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {state.players.map((player) => {
          const last = lastRoundPoints(player);
          const turn = state.currentPlayerId === player.id;
          const out = state.wentOutId === player.id;
          return (
            <div
              key={player.id}
              className={cn(
                "rounded-2xl border px-3 py-3",
                turn
                  ? "your-turn-glow border-amber-300 bg-amber-300/15"
                  : out
                    ? "border-amber-200/40 bg-amber-950/40"
                    : "border-white/10 bg-black/25",
              )}
            >
              <p className="flex flex-wrap items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/60">
                {player.isYou ? <span className="text-amber-200">You</span> : null}
                {turn ? <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[#3b2200]">Turn</span> : null}
                {out ? <span className="text-amber-200">Went out</span> : null}
                {player.isBot ? <span>Bot</span> : null}
              </p>
              <p className="mt-1 flex items-center gap-2 truncate text-base font-bold text-white">
                <SeatAvatar avatar={player.avatar} seatIndex={player.seatIndex} initials={player.name} size="sm" current={turn} />
                <span className="truncate">
                  <SitName name={player.name} goldGlow={playerGold(player)} />
                </span>
              </p>
              <p className="font-display text-3xl font-extrabold tabular-nums leading-none text-amber-100">
                {player.score}
              </p>
              <p className="mt-1 text-xs text-emerald-100/70">
                {last == null ? "No rounds scored yet" : `Last round +${last}`}
              </p>
            </div>
          );
        })}
      </div>
      {open ? (
        <div className="mt-3">
          <RoundTable players={state.players} rounds={rounds} wentOutId={state.wentOutId} />
        </div>
      ) : null}
    </section>
  );
}

function ScoreRecap({
  state,
  onNextRound,
  onRematch,
}: {
  state: ClientView;
  onNextRound: () => void;
  onRematch: () => void;
}) {
  const matchOver = state.phase === "match_end";
  const seconds = useSecondsLeft(matchOver ? null : state.autoNextAt);
  const standings = rankStandings(state.players);
  const rounds = scoredRoundCount(state.players, state.round);
  const winners = state.players.filter((player) => state.winnerIds.includes(player.id));

  return (
    <section className="felt-table flex-1 rounded-3xl p-3 sm:p-5">
      <div className="rounded-2xl border border-amber-200/25 bg-black/35 p-4 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200/80">
          {matchOver
            ? "Match over"
            : state.wagerSuddenDeath
              ? "Sudden death hand complete"
              : `Round ${state.round} of ${ROUND_COUNT} complete`}
        </p>
        <h2 className="font-display mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {matchOver ? "Final standings" : "Scores"}
        </h2>
        <p className="mt-1 text-base text-emerald-50">
          {matchOver
            ? `Lowest total wins. ${winners.map((player) => player.name).join(" & ") || "Someone"} ${
                winners.length === 1 ? "takes" : "share"
              } the table.`
            : state.wagerSuddenDeath
              ? `Tied for first — next hand is deal 3. ${state.wentOutName ?? "Someone"} went out.`
              : `${state.wentOutName ?? "Someone"} went out · ${wildSpoken(state.wildRank)} were wild`}
        </p>
        {state.wagerRules && !matchOver ? (
          <p className="mt-2 text-sm font-semibold text-amber-100">
            Play money {formatPlayMoney(state.wagerStake)}
            {state.wagerSuddenDeath ? " · sudden death until one unique lowest score" : ""}.
          </p>
        ) : null}
        {matchOver && state.wagerSettlement ? (
          <div className="mt-3 rounded-2xl border border-amber-200/30 bg-amber-950/35 px-4 py-3">
            <p className="text-sm font-semibold text-amber-100">
              🏆 {state.wagerSettlement.winnerName} collected{" "}
              {formatPlayMoney(state.wagerSettlement.winnerCollected)} play money.
            </p>
            <ul className="mt-2 space-y-1 text-sm text-emerald-50">
              {state.wagerSettlement.owes.map((owe) => (
                <li key={owe.playerId}>{wagerOweLine(owe, state.wagerSettlement!.winnerName)}</li>
              ))}
            </ul>
            {formatStakePath(state.wagerSettlement.stakePath) ? (
              <p className="mt-2 text-xs text-emerald-100/70">
                {formatStakePath(state.wagerSettlement.stakePath)}
              </p>
            ) : (
              <p className="mt-2 text-xs text-emerald-100/70">
                Stake stayed {formatPlayMoney(state.wagerSettlement.stake)}.
              </p>
            )}
            {state.wagerSettlement.perfectSweep && state.wagerSettlement.sweeperName ? (
              <p className="mt-1 text-xs text-amber-100/80">
                {state.wagerSettlement.sweeperName} went out first on every regulation hand.
              </p>
            ) : null}
            {state.wagerSettlement.suddenDeathHands > 0 ? (
              <p className="mt-1 text-xs text-emerald-100/70">
                Settled after {state.wagerSettlement.suddenDeathHands} sudden-death{" "}
                {state.wagerSettlement.suddenDeathHands === 1 ? "hand" : "hands"}.
              </p>
            ) : null}
          </div>
        ) : null}
        {matchOver ? (
          <div className="mt-4">
            <Button variant="gold" size="lg" className="w-full sm:w-auto sm:min-w-[12rem]" onClick={onRematch}>
              Back to lobby
            </Button>
            <p className="mt-2 text-sm text-emerald-100/70">
              Same room and seats. Change house rules if you want, then start again — or leave.
            </p>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {standings.map((player) => {
            const row = revealedFor(state.revealed, player.id);
            const last = lastRoundPoints(player);
            const winner = state.winnerIds.includes(player.id);
            return (
              <div
                key={player.id}
                className={cn(
                  "rounded-2xl border px-4 py-4",
                  winner
                    ? "border-amber-300 bg-amber-300/15"
                    : player.isYou
                      ? "border-amber-200/30 bg-amber-950/30"
                      : "border-white/10 bg-black/30",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
                      {placeLabel(player.place)}
                      {winner ? " · winner" : ""}
                      {player.isYou ? " · you" : ""}
                    </p>
                    <p className="text-xl font-extrabold text-white">
                      {winner && matchOver && state.wagerRules ? "🏆 " : ""}
                      <SitName name={player.name} goldGlow={playerGold(player)} />
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-emerald-100/60">Total</p>
                    <p className="font-display text-4xl font-extrabold tabular-nums leading-none text-amber-100">
                      {player.score}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-emerald-50">
                  This round {last == null ? "—" : `+${last}`}
                  {state.wentOutId === player.id ? " · went out (0)" : ""}
                </p>
                <div className="mt-2">
                  <DeadwoodLine row={row} wildRank={state.wildRank} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-100/60">
            Per-round card
          </p>
          <RoundTable players={state.players} rounds={rounds} wentOutId={state.wentOutId} />
        </div>

        <div className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {matchOver ? (
            <Button variant="gold" size="lg" className="sm:min-w-[12rem]" onClick={onRematch}>
              Back to lobby
            </Button>
          ) : (
            <Button variant="gold" size="lg" className="sm:min-w-[12rem]" onClick={onNextRound}>
              Next round{seconds != null ? ` · ${seconds}s` : ""}
            </Button>
          )}
          <p className="text-sm text-emerald-100/70">
            {matchOver
              ? "Anyone seated can return. Same room code."
              : seconds != null
                ? `Next deal in ${seconds}s, or tap Next round when you have read the card.`
                : "Tap Next round when you are ready."}
          </p>
        </div>
        {matchOver ? (
          <div className="mt-4">
            <DonateLink url={state.donateUrl} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function Scoreboard({
  state,
  onNextRound,
  onRematch,
}: {
  state: ClientView;
  onNextRound: () => void;
  onRematch: () => void;
}) {
  if (state.phase === "round_end" || state.phase === "match_end") {
    return <ScoreRecap state={state} onNextRound={onNextRound} onRematch={onRematch} />;
  }
  return <LiveScores state={state} />;
}
