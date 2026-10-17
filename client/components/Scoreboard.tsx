import { dealCountForRound, isRed, isWild, rankLabel, ROUND_COUNT, SUIT_GLYPH, wildRankForRound, wildSpoken } from "@shared/cards";
import {
  AUTO_NEXT_MS,
  countdownProgress,
  lastRoundPoints,
  liveScoreCompact,
  nextDealBrief,
  placeLabel,
  rankStandings,
  revealedFor,
  roundTableCompact,
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
import { ShowWentOutCardsButton } from "./WentOutHand";
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
  const compact = roundTableCompact(players.length, rounds);
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-white/10 bg-black/25",
        compact && "round-table-compact",
      )}
      data-round-table-compact={compact ? "true" : "false"}
    >
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-emerald-100/60">
            <th className="col-player bg-[#0c2419] px-3 py-2 font-semibold">Player</th>
            {Array.from({ length: rounds }, (_, i) => (
              <th key={i} className="col-round px-2 py-2 text-center font-semibold">
                {scoreRoundLabel(i + 1)}
              </th>
            ))}
            <th className="col-total bg-[#0c2419] px-3 py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((player) => {
            const rowBg = player.isYou ? "bg-[#24361c]" : "bg-[#10281c]";
            return (
            <tr
              key={player.id}
              className={cn(
                "border-b border-white/5",
                player.isYou ? "bg-amber-300/10" : "",
                wentOutId === player.id ? "bg-emerald-400/5" : "",
              )}
            >
              <th className={cn("col-player px-3 py-2 font-semibold text-white", rowBg)}>
                <span className="turn-seat-name">
                  <SitName name={player.name} goldGlow={playerGold(player)} />
                  {player.isYou ? " · you" : ""}
                  {wentOutId === player.id ? " · out" : ""}
                </span>
              </th>
              {Array.from({ length: rounds }, (_, i) => (
                <td key={i} className="col-round px-2 py-2 text-center tabular-nums text-emerald-50">
                  {player.roundScores[i] == null ? "—" : player.roundScores[i]}
                </td>
              ))}
              <td className={cn("col-total px-3 py-2 text-right text-base font-extrabold tabular-nums text-amber-100", rowBg)}>
                {player.score}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LiveScores({ state, onShowWentOutCards }: { state: ClientView; onShowWentOutCards: () => void }) {
  const [open, setOpen] = useState(false);
  const rounds = scoredRoundCount(state.players, state.round);
  const standings = rankStandings(state.players);
  const compact = liveScoreCompact(state.players.length);
  return (
    <section className="live-scores-card score-strip rounded-2xl border border-white/10 bg-black/30 px-2.5 py-2" data-live-scores>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200/80">
          Scoreboard
          <span className="ml-2 font-bold normal-case tracking-normal text-emerald-50">
            {state.currentPlayerName ? `${state.currentPlayerName}'s turn` : "Lowest total is winning"}
          </span>
        </p>
        <div className="flex items-center gap-2">
          {state.wentOutMelds && state.wentOutMelds.length > 0 ? (
            <ShowWentOutCardsButton onShow={onShowWentOutCards} />
          ) : null}
          {rounds > 0 ? (
            <Button size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
              {open ? "Hide rounds" : "All rounds"}
            </Button>
          ) : null}
        </div>
      </div>
      <div className={cn("score-strip-row mt-1.5", compact && "score-strip-compact")} role="list">
        {standings.map((player) => {
          const turn = state.currentPlayerId === player.id;
          const out = state.wentOutId === player.id;
          return (
            <div
              key={player.id}
              role="listitem"
              title={player.name}
              aria-label={`${player.name}, ${player.score}${turn ? ", current turn" : ""}${player.isYou ? ", you" : ""}`}
              className={cn(
                "score-strip-player",
                turn && "is-turn",
                player.isYou && "is-you",
                out && "is-out",
              )}
            >
              <SeatAvatar
                avatar={state.players.find((seat) => seat.id === player.id)?.avatar ?? null}
                seatIndex={state.players.find((seat) => seat.id === player.id)?.seatIndex ?? 0}
                initials={player.name}
                size="sm"
                current={turn}
              />
              {compact ? null : (
                <span className="score-strip-name">
                  {player.isYou ? "You" : player.name}
                  {player.isBot ? " · bot" : ""}
                </span>
              )}
              <span className="flex items-center gap-1">
                {player.isYou && compact ? <span className="score-strip-flag">You</span> : null}
                {turn ? <span className="score-strip-flag">Turn</span> : null}
              </span>
              <span className="score-strip-total">{player.score}</span>
            </div>
          );
        })}
      </div>
      {open ? (
        <div className="mt-2">
          <RoundTable players={state.players} rounds={rounds} wentOutId={state.wentOutId} />
        </div>
      ) : null}
    </section>
  );
}

function NextRoundDock({
  state,
  onNextRound,
}: {
  state: ClientView;
  onNextRound: () => void;
}) {
  const seconds = useSecondsLeft(state.autoNextAt);
  const regulation = nextDealBrief(state.round);
  const brief = state.wagerSuddenDeath
    ? {
        round: 1,
        wild: wildSpoken(wildRankForRound(1)),
        cardsEach: dealCountForRound(1),
      }
    : regulation;
  if (!brief) return null;
  const progress = countdownProgress(seconds, AUTO_NEXT_MS / 1000);
  return (
    <div className="next-round-dock" data-next-round-dock>
      <div className="next-round-wild">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber-200/80">
          {state.wagerSuddenDeath ? "Next · sudden death" : `Next · Round ${brief.round} of ${ROUND_COUNT}`}
        </p>
        <p className="font-display text-2xl font-extrabold leading-tight text-amber-100">{brief.wild} are wild</p>
        <p className="text-sm text-emerald-100/75">{brief.cardsEach} cards each</p>
      </div>
      <div className="next-round-count">
        <p className="text-sm font-bold text-white">
          {seconds != null ? `Next round starts in ${seconds}s` : "Next round is ready"}
        </p>
        <div className="next-round-bar" aria-hidden>
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="gold" className="h-11 min-w-[8.5rem] touch-manipulation font-extrabold" onClick={onNextRound}>
            Deal now
          </Button>
          <span className="text-sm text-emerald-100/65">or wait</span>
        </div>
      </div>
    </div>
  );
}

function ScoreRecap({
  state,
  onNextRound,
  onRematch,
  onShowWentOutCards,
}: {
  state: ClientView;
  onNextRound: () => void;
  onRematch: () => void;
  onShowWentOutCards: () => void;
}) {
  const matchOver = state.phase === "match_end";
  const standings = rankStandings(state.players);
  const rounds = scoredRoundCount(state.players, state.round);
  const winners = state.players.filter((player) => state.winnerIds.includes(player.id));

  return (
    <section className="felt-table score-recap flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl p-3 sm:p-4">
      <div className="score-recap-scroll min-h-0 flex-1 overflow-auto rounded-2xl border border-amber-200/25 bg-black/35 p-4 sm:p-5">
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

        <div className="mt-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
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
                {state.wentOutId === player.id && state.wentOutMelds && state.wentOutMelds.length > 0 ? (
                  <div className="mt-2">
                    <ShowWentOutCardsButton onShow={onShowWentOutCards} />
                  </div>
                ) : null}
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

        {matchOver ? (
          <div className="mt-5">
            <Button variant="gold" size="lg" className="sm:min-w-[12rem]" onClick={onRematch}>
              Back to lobby
            </Button>
            <p className="mt-2 text-sm text-emerald-100/70">Anyone seated can return. Same room code.</p>
            <div className="mt-4">
              <DonateLink url={state.donateUrl} />
            </div>
          </div>
        ) : null}
      </div>
      {matchOver ? null : <NextRoundDock state={state} onNextRound={onNextRound} />}
    </section>
  );
}

export function Scoreboard({
  state,
  onNextRound,
  onRematch,
  onShowWentOutCards,
}: {
  state: ClientView;
  onNextRound: () => void;
  onRematch: () => void;
  onShowWentOutCards: () => void;
}) {
  if (state.phase === "round_end" || state.phase === "match_end") {
    return (
      <ScoreRecap
        state={state}
        onNextRound={onNextRound}
        onRematch={onRematch}
        onShowWentOutCards={onShowWentOutCards}
      />
    );
  }
  return <LiveScores state={state} onShowWentOutCards={onShowWentOutCards} />;
}
