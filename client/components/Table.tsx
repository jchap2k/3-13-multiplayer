import { Accessibility, MessageCircle } from "lucide-react";
import { formatCard, wildSpoken } from "@shared/cards";
import { formatPlayMoney } from "@shared/wager";
import { formatTurnClock } from "@shared/turnClock";
import type { ChatMessage } from "@shared/chat";
import type { ClientView } from "@shared/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { useA11y } from "../lib/A11yContext";
import { announceFeel, shouldAnnounceRound } from "../lib/announce";
import { playTurnChime, shouldPlayTurnSound } from "../lib/turnSound";
import { wentOutFlashKey } from "../lib/wentOutFlash";
import { shouldClearHandSelection } from "../lib/handSelect";
import { handOrderKey } from "../lib/handOrder";
import { Hand } from "./Hand";
import { DiscardBar } from "./DiscardBar";
import { CardBack, DiscardGhost, PlayingCard } from "./PlayingCard";
import { AccessibilityPanel } from "./AccessibilityPanel";
import { DonateLink } from "./DonateLink";
import { Scoreboard } from "./Scoreboard";
import { TableChatBar } from "./TableChatBar";
import { isStandInToast } from "@shared/botPlay";
import { isSoloStartBotToast } from "@shared/soloStart";
import { AutoPlayCheck, BotPlayBadge, HostStandInBar } from "./BotPlayControls";
import { SeatAvatar } from "./SeatAvatar";
import { SitName, playerGold } from "./SitName";
import { TurnStrip } from "./TurnStrip";
import { WildBanner, WildToast } from "./WildAnnounce";
import { HowToPlayButton } from "./HowToPlay";
import { LearningToggle } from "./LearningToggle";
import { useLearning } from "../lib/LearningContext";
import { CoachOverlay } from "./CoachOverlay";
import { LeaveRoomButton } from "./LeaveRoomButton";
import { WentOutBanner } from "./WentOutHand";
import { Button } from "./ui/button";

function remainingSeconds(turnEndsAt: number | null): number | null {
  if (!turnEndsAt) return null;
  return Math.max(0, Math.ceil((turnEndsAt - Date.now()) / 1000));
}

function useTurnSeconds(turnEndsAt: number | null): number | null {
  const [left, setLeft] = useState(() => remainingSeconds(turnEndsAt));
  useEffect(() => {
    const tick = () => setLeft(remainingSeconds(turnEndsAt));
    tick();
    if (turnEndsAt == null) return;
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [turnEndsAt]);
  return left;
}

export function Table({
  state,
  onDrawStock,
  onTakeDiscard,
  onDiscard,
  onGoOut,
  onNextRound,
  onRematch,
  onEndGame,
  onLeaveRoom,
  onOpenChat,
  chatOverlay = true,
  chatMessages = [],
  onSendChat,
  chatFocusTick = 0,
  onSetBotPlay,
}: {
  state: ClientView;
  onDrawStock: () => void;
  onTakeDiscard: () => void;
  onDiscard: (cardId: string) => void;
  onGoOut: (cardId: string) => void;
  onNextRound: () => void;
  onRematch: () => void;
  onEndGame: () => void;
  onLeaveRoom: () => void;
  onOpenChat: () => void;
  chatOverlay?: boolean;
  chatMessages?: ChatMessage[];
  onSendChat?: (text: string) => void;
  chatFocusTick?: number;
  onSetBotPlay?: (playerId: string, on: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [a11yOpen, setA11yOpen] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);
  const [wildToast, setWildToast] = useState(false);
  const [idleToast, setIdleToast] = useState<string | null>(null);
  const [wentOutHidden, setWentOutHidden] = useState(false);
  const { prefs } = useA11y();
  const { learning, setLearning } = useLearning();
  const lastIdleMessage = useRef<string | null>(null);
  const previousPlayerId = useRef<string | null>(null);
  const wasMyTurn = useRef<boolean | null>(null);
  const lastWentOutKey = useRef<string | null>(null);
  const discardRef = useRef<HTMLButtonElement>(null);
  const canGoOut = Boolean(selected && state.goOutCardIds.includes(selected));

  function throwCard(cardId: string) {
    setSelected(null);
    if (state.goOutCardIds.includes(cardId)) onGoOut(cardId);
    else onDiscard(cardId);
  }

  useEffect(() => {
    const idleAutoMove = state.message.includes("was idle");
    if (
      shouldClearHandSelection({
        selected,
        yourTurn: state.yourTurn,
        turnPhase: state.turnPhase,
        handIds: state.yourHand.map((card) => card.id),
        idleAutoMove,
        currentPlayerId: state.currentPlayerId,
        previousPlayerId: previousPlayerId.current,
      })
    ) {
      setSelected(null);
    }
    previousPlayerId.current = state.currentPlayerId;
  }, [
    selected,
    state.yourTurn,
    state.turnPhase,
    state.yourHand,
    state.message,
    state.currentPlayerId,
  ]);

  useEffect(() => {
    const mine = state.phase === "playing" && state.yourTurn;
    if (prefs.turnSound && shouldPlayTurnSound(wasMyTurn.current, mine)) {
      playTurnChime();
    }
    wasMyTurn.current = mine;
  }, [prefs.turnSound, state.phase, state.yourTurn]);

  useEffect(() => {
    if (state.phase !== "playing") {
      setWildToast(false);
      return;
    }
    if (!shouldAnnounceRound(state.roomCode, state.round)) return;
    setWildToast(true);
    announceFeel();
    const timer = window.setTimeout(() => setWildToast(false), 3800);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.round, state.roomCode]);

  const wentOutKey = wentOutFlashKey(state.roomCode, state.round, state.wentOutId);
  useEffect(() => {
    if (wentOutKey === lastWentOutKey.current) return;
    lastWentOutKey.current = wentOutKey;
    setWentOutHidden(false);
  }, [wentOutKey]);

  useEffect(() => {
    setWentOutHidden(false);
  }, [state.phase]);

  useEffect(() => {
    const standIn = isStandInToast(state.message);
    const idle = state.message.includes("was idle");
    const soloBot = isSoloStartBotToast(state.message);
    if (!standIn && !idle && !soloBot) return;
    if (lastIdleMessage.current === state.message) return;
    lastIdleMessage.current = state.message;
    setIdleToast(state.message);
    const timer = window.setTimeout(() => setIdleToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [state.message]);

  const currentSeat = state.players.find((player) => player.id === state.currentPlayerId);
  const turnSeconds = useTurnSeconds(
    state.phase === "playing" && (state.autoMove || Boolean(currentSeat?.botPlay))
      ? state.turnEndsAt
      : null,
  );
  const you = state.players.find((player) => player.isYou);
  const hint = useMemo(() => {
    if (state.phase === "round_end") return "Round over — scores posted";
    if (state.phase === "match_end") return "Match over — lowest total wins";
    if (state.wentOutName) return `Last turns after ${state.wentOutName} went out`;
    if (currentSeat?.botPlay && state.currentPlayerName) {
      return `Auto-play is on for ${state.currentPlayerName}`;
    }
    if (state.yourTurn && state.turnPhase === "draw") {
      return state.autoMove
        ? "Your turn: draw stock or take discard"
        : "Your turn — no auto-move. Draw stock or take discard.";
    }
    if (state.yourTurn && state.turnPhase === "discard") {
      return state.autoMove ? "Your turn — discard" : "Your turn — no auto-move. Discard when you are ready.";
    }
    if (state.currentPlayerName) {
      if (turnSeconds != null) return `${state.currentPlayerName}'s turn · ${formatTurnClock(turnSeconds)}`;
      return state.autoMove
        ? `${state.currentPlayerName}'s turn`
        : `Waiting for ${state.currentPlayerName} — no auto-move`;
    }
    return "Waiting";
  }, [state, turnSeconds, currentSeat?.botPlay]);

  const selectedCard = state.yourHand.find((card) => card.id === selected) ?? null;
  const canDrawStock = state.yourTurn && state.turnPhase === "draw" && state.stockCount > 0;
  const canTakeDiscard = Boolean(state.yourTurn && state.turnPhase === "draw" && state.discardTop);
  const showStock =
    state.stockCount > 0 || (state.yourTurn && state.turnPhase === "draw" && state.discardCount > 1);
  const wentOutByYou = Boolean(state.wentOutId && state.players.some((player) => player.id === state.wentOutId && player.isYou));
  const wentOutDetail =
    state.phase === "playing"
      ? wentOutByYou
        ? "You went out. Everyone else still takes one last turn."
        : state.yourTurn && state.turnPhase === "draw"
          ? "Last turn: you — draw, then discard."
          : state.yourTurn && state.turnPhase === "discard"
            ? "Last turn: you — discard."
            : state.currentPlayerName
              ? `Last turn: ${state.currentPlayerName}.`
              : "Last turns are still going."
      : "Last turns are done — final hands below. Nothing to close.";
  const showWentOutBanner = Boolean(state.wentOutName) && !wentOutHidden;

  useEffect(() => {
    if (selected && state.yourTurn && state.turnPhase === "discard") {
      discardRef.current?.focus();
    }
  }, [selected, state.yourTurn, state.turnPhase]);

  return (
    <div className="table-shell felt-bg text-white">
      <div
        className="table-frame mx-auto w-full max-w-5xl px-3 py-3 sm:px-5"
        data-phase={state.phase}
      >
        <header className="table-chrome">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-100">Room {state.roomCode}</p>
              <p className="text-xs text-emerald-100/70">{state.message}</p>
              {state.wagerRules ? (
                <p className="mt-1 text-xs font-semibold text-amber-200/90">
                  Play money {formatPlayMoney(state.wagerStake)}
                  {state.wagerSuddenDeath ? " · sudden death" : ""}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <LeaveRoomButton compact onLeave={onLeaveRoom} />
              {state.phase === "playing" || state.phase === "round_end" ? (
                state.isHost ? (
                  <Button
                    size="sm"
                    variant="gold"
                    className="shrink-0"
                    onClick={() => setEndConfirm(true)}
                  >
                    End game
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="shrink-0 opacity-70" disabled>
                    Host can end game
                  </Button>
                )
              ) : null}
              <HowToPlayButton compact />
              <div className="rounded-2xl bg-black/35 px-2 py-1">
                <LearningToggle compact label="Learning" checked={learning} onChange={setLearning} />
              </div>
              <button
                type="button"
                onClick={() => setA11yOpen(true)}
                className="rounded-full bg-black/35 p-2 text-amber-100 hover:bg-black/50"
                aria-label="Accessibility options"
              >
                <Accessibility className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onOpenChat}
                className="rounded-full bg-black/35 p-2 text-amber-100 hover:bg-black/50"
                aria-label="Open table talk"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              {state.phase === "round_end" ? (
                <div className="rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#3b2200]">
                  Scores
                </div>
              ) : state.phase === "match_end" ? (
                <div className="rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#3b2200]">
                  Final
                </div>
              ) : state.yourTurn ? (
                <div className="your-turn-glow rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#3b2200]">
                  Your turn{turnSeconds != null ? ` · ${formatTurnClock(turnSeconds)}` : ""}
                </div>
              ) : (
                <div className="rounded-full bg-black/35 px-3 py-1 text-xs font-semibold text-emerald-100/80">
                  {state.currentPlayerName
                    ? `${state.currentPlayerName}'s turn${turnSeconds != null ? ` · ${formatTurnClock(turnSeconds)}` : ""}`
                    : "Table"}
                </div>
              )}
            </div>
          </div>
          {endConfirm ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 px-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="end-game-title"
                className="w-full max-w-sm rounded-2xl border border-amber-200/30 bg-[#10261c] p-4 shadow-xl"
              >
                <p id="end-game-title" className="text-lg font-extrabold text-white">
                  End game and return to lobby?
                </p>
                <p className="mt-2 text-sm text-emerald-100/70">
                  The current match stops. Same room code and seats. Scores for this match are cleared.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="gold"
                    onClick={() => {
                      setEndConfirm(false);
                      onEndGame();
                    }}
                  >
                    End game
                  </Button>
                  <Button variant="outline" onClick={() => setEndConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <WildBanner
            round={state.round}
            wildRank={state.wildRank}
            dealCount={state.dealCount}
            jokers={state.jokers}
            suddenDeath={state.wagerSuddenDeath}
            markWilds={prefs.markWilds}
            tense={state.phase === "playing" ? "are" : "were"}
            aside={
              state.phase === "playing" ? (
                <>
                  {state.isHost && you ? (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-100/85">
                      Host {you.name}
                      {you.isYou ? " · you" : ""}
                    </span>
                  ) : null}
                  {onSetBotPlay && you && !you.isBot ? (
                    <AutoPlayCheck player={you} onToggle={onSetBotPlay} />
                  ) : null}
                </>
              ) : null
            }
          />
          <CoachOverlay
            state={state}
            onDrawStock={onDrawStock}
            onTakeDiscard={onTakeDiscard}
            onDiscard={onDiscard}
            onGoOut={onGoOut}
            onNextRound={onNextRound}
          />
          {state.isHost && onSetBotPlay && (state.phase === "playing" || state.phase === "round_end") ? (
            <HostStandInBar players={state.players} onToggle={onSetBotPlay} />
          ) : null}
          {state.phase === "playing" && chatOverlay && onSendChat ? (
            <TableChatBar
              messages={chatMessages}
              youId={state.youId}
              youName={state.players.find((player) => player.isYou)?.name ?? ""}
              focusTick={chatFocusTick}
              onSend={onSendChat}
            />
          ) : null}
        </header>

        {showWentOutBanner && state.wentOutName ? (
          <WentOutBanner
            name={state.wentOutName}
            melds={state.wentOutMelds}
            wildRank={state.wildRank}
            detail={wentOutDetail}
            onDismiss={() => setWentOutHidden(true)}
          />
        ) : null}

        {state.phase === "round_end" || state.phase === "match_end" ? (
          <div className="score-recap-pane mt-2">
            <Scoreboard
              state={state}
              onNextRound={onNextRound}
              onRematch={onRematch}
              onShowWentOutCards={() => setWentOutHidden(false)}
            />
          </div>
        ) : (
        <div className="play-split">
        <div className="pane-table">
        <p className="pane-label">Table</p>
        {state.phase === "playing" ? (
          <div className="table-turn-strip">
            <TurnStrip players={state.players} currentId={state.currentPlayerId} />
          </div>
        ) : null}

        <div className="felt-table table-surface mt-2 rounded-3xl p-3 sm:p-4">
          <div className="table-surface-inner">
            <div className="pile-row felt-piles flex flex-nowrap items-end justify-center gap-6 py-1">
              <div className="pile-stack text-center">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-100/70">Stock</p>
                {showStock ? (
                  <div className={canDrawStock ? "pile-hot" : ""}>
                    <CardBack
                      size="pile"
                      label="deck"
                      ariaLabel={
                        canDrawStock
                          ? `Draw from the stock, ${state.stockCount} left`
                          : `Stock, ${state.stockCount} left`
                      }
                      onClick={canDrawStock ? onDrawStock : undefined}
                    />
                  </div>
                ) : (
                  <div className="pile-empty flex items-center justify-center rounded-[0.7rem] border border-dashed border-white/30 text-xs">
                    {state.discardTop ? "take discard" : "empty"}
                  </div>
                )}
                <p className="mt-1 text-xs font-semibold text-emerald-50">
                  {state.stockCount > 0
                    ? canDrawStock
                      ? `${state.stockCount} left · tap to draw`
                      : `${state.stockCount} left`
                    : "empty"}
                </p>
              </div>
              <div className="pile-stack text-center">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-100/70">Discard</p>
                <div className="relative inline-block">
                  {state.discardTop ? (
                    <div className={canTakeDiscard ? "pile-hot discard-glow" : "discard-glow"}>
                      <PlayingCard
                        card={state.discardTop}
                        wildRank={state.wildRank}
                        largePips={prefs.largePips}
                        size="pile"
                        onClick={canTakeDiscard ? onTakeDiscard : undefined}
                      />
                      {canTakeDiscard ? (
                        <button
                          type="button"
                          className="take-pill"
                          onClick={onTakeDiscard}
                        >
                          TAKE {formatCard(state.discardTop)}
                        </button>
                      ) : (
                        <span className="take-pill take-pill-quiet">TAKE {formatCard(state.discardTop)}</span>
                      )}
                    </div>
                  ) : (
                    <div className="pile-empty flex items-center justify-center rounded-[0.7rem] border border-dashed border-white/30 text-xs">
                      empty
                    </div>
                  )}
                  {state.scoopedDiscard ? (
                    <div
                      className="pointer-events-none absolute left-[70%] top-1 z-10 -rotate-[14deg]"
                      role="status"
                      aria-live="polite"
                      aria-label={`Scooped ${formatCard(state.scoopedDiscard)}`}
                    >
                      <DiscardGhost card={state.scoopedDiscard} />
                      <p className="mt-0.5 text-center text-[10px] font-semibold uppercase tracking-wider text-amber-100/80">
                        scooped
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        <div className="pane-hand table-hand">
        <p className="pane-label">Your hand</p>
            <div
              className={
                state.yourTurn
                  ? "hand-slot rounded-2xl bg-amber-300/10 p-2 ring-1 ring-amber-300/30"
                  : "hand-slot"
              }
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2 text-sm text-emerald-50">
                  {you ? (
                    <SeatAvatar
                      avatar={you.avatar}
                      seatIndex={you.seatIndex}
                      initials={you.name}
                      size="sm"
                      current={state.yourTurn}
                    />
                  ) : null}
                  {you ? <SitName name={you.name} goldGlow={playerGold(you)} /> : "You"}
                  {state.yourTurn ? " — your turn" : ""}
                  {you ? ` — ${you.cardCount} cards` : " — not seated"}
                  {you ? <BotPlayBadge player={you} /> : null}
                </p>
              </div>
              <Hand
                hand={state.yourHand}
                wildRank={state.wildRank}
                storageKey={handOrderKey(state.youId, state.roomCode, state.round)}
                selected={selected}
                onSelect={setSelected}
                onConfirm={throwCard}
                onGestureDiscard={throwCard}
                selectable={state.yourTurn && state.turnPhase === "discard"}
                goOutIds={state.yourTurn && state.turnPhase === "discard" ? state.goOutCardIds : []}
                largePips={prefs.largePips}
                acePoints={state.acePoints}
                wildFaceValue={state.wildFaceValue}
              />
            </div>
        </div>
          {state.phase === "playing" ? (
            <div className="live-scores-playing">
              <Scoreboard
                state={state}
                onNextRound={onNextRound}
                onRematch={onRematch}
                onShowWentOutCards={() => setWentOutHidden(false)}
              />
            </div>
          ) : null}
        </div>
        )}

        {state.phase === "playing" ? (
          <DiscardBar
            card={selectedCard}
            wildRank={state.wildRank}
            enabled={Boolean(selectedCard && state.yourTurn && state.turnPhase === "discard")}
            goesOut={canGoOut}
            onDiscard={() => {
              if (!selectedCard) return;
              throwCard(selectedCard.id);
            }}
            onDeselect={() => setSelected(null)}
            buttonRef={discardRef}
          />
        ) : (
          <footer className="table-footer mt-3 pb-[env(safe-area-inset-bottom)]">
            <div className="score-chip rounded-2xl px-3 py-2 text-sm font-semibold text-emerald-50">
              {hint}
            </div>
          </footer>
        )}
        <p className="table-rules mt-2 pb-3 text-center text-[11px] text-emerald-100/60">
          Drag to rearrange. {wildSpoken(state.wildRank)} are wild
          {state.jokers ? "; jokers always are" : ""}. Deadwood aces score {state.acePoints}.
          {state.wildFaceValue
            ? " Caught wilds score face value; jokers score 0."
            : " Caught wilds score 15; jokers score 20."}
          {state.autoMove ? " Idle auto-move is on (3 min / 180s)." : " Idle auto-move is off."}
          {state.wagerRules
            ? ` Wager on — play money ${formatPlayMoney(state.wagerStake)}.`
            : " Wager off."}{" "}
          Aces high or low in runs. Lowest total after 11 rounds wins
          {state.wagerRules ? " (ties play sudden death)" : ""}.{" "}
          <DonateLink url={state.donateUrl} compact className="text-amber-100/80" />
        </p>
      </div>
      <WildToast
        open={wildToast}
        round={state.round}
        wildRank={state.wildRank}
        dealCount={state.dealCount}
        jokers={state.jokers}
        suddenDeath={state.wagerSuddenDeath}
        onDismiss={() => setWildToast(false)}
      />
      {a11yOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 p-4 backdrop-blur-[2px] sm:items-center"
          onClick={() => setA11yOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#10261c] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <AccessibilityPanel compact />
            <Button className="mt-4 w-full" variant="gold" onClick={() => setA11yOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      ) : null}
      {idleToast && state.phase === "playing" ? (
        <div
          className="fixed bottom-28 left-1/2 z-40 w-[min(28rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-2xl border border-amber-200/40 bg-[#1a1408] px-4 py-3 text-center shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          role="status"
          aria-live="polite"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">
            {isSoloStartBotToast(idleToast)
              ? "Table"
              : isStandInToast(idleToast)
                ? "Auto-play"
                : "Auto-move"}
          </p>
          <p className="mt-1 text-sm font-semibold text-amber-50">{idleToast}</p>
        </div>
      ) : null}
    </div>
  );
}
