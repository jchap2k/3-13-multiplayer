import { coachAdvice, type CoachAction } from "@shared/coach";
import type { ClientView } from "@shared/types";
import { useEffect, useState } from "react";
import { coachActive } from "../lib/tutorial";
import { useTutorial } from "../lib/TutorialContext";
import { Button } from "./ui/button";

export function CoachOverlay({
  state,
  onDrawStock,
  onTakeDiscard,
  onDiscard,
  onGoOut,
  onNextRound,
}: {
  state: ClientView;
  onDrawStock: () => void;
  onTakeDiscard: () => void;
  onDiscard: (cardId: string) => void;
  onGoOut: (cardId: string) => void;
  onNextRound: () => void;
}) {
  const { prefs, patch, openHowTo } = useTutorial();
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const active = coachActive(prefs, state.round, state.phase);
  const tip = active
    ? coachAdvice({
        phase: state.phase,
        round: state.round,
        dealCount: state.dealCount,
        wildRank: state.wildRank,
        yourTurn: state.yourTurn,
        turnPhase: state.turnPhase,
        yourHand: state.yourHand,
        discardTop: state.discardTop,
        goOutCardIds: state.goOutCardIds,
        lastTurnNames: state.lastTurnNames,
        acePoints: state.acePoints,
        wildFaceValue: state.wildFaceValue,
        currentPlayerName: state.currentPlayerName,
      })
    : null;

  useEffect(() => {
    setHiddenId(null);
  }, [state.round, state.turnPhase, state.yourTurn, state.phase]);

  if (!active || !tip || tip.id === hiddenId) return null;

  function run(action: CoachAction, cardId?: string) {
    if (action === "drawStock") onDrawStock();
    else if (action === "takeDiscard") onTakeDiscard();
    else if (action === "discard" && cardId) onDiscard(cardId);
    else if (action === "goOut" && cardId) onGoOut(cardId);
    else if (action === "nextRound") onNextRound();
  }

  return (
    <aside
      className="coach-overlay mt-3 rounded-2xl border border-sky-200/30 bg-sky-950/40 px-3 py-3 text-sky-50"
      role="status"
      aria-live="polite"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200/80">
        Coach · hand {state.round} of 5
      </p>
      <p className="mt-1 font-display text-lg font-extrabold leading-tight text-white">{tip.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-sky-50/90">{tip.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {tip.action ? (
          <Button
            variant="gold"
            size="sm"
            onClick={() => run(tip.action!, tip.cardId)}
            disabled={
              (tip.action === "discard" || tip.action === "goOut") && !tip.cardId
            }
          >
            {tip.actionLabel ?? "Do that for me"}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => setHiddenId(tip.id)}>
          Hide tip
        </Button>
        <Button variant="ghost" size="sm" onClick={() => patch({ coach: false })}>
          Stop coach
        </Button>
        <button
          type="button"
          className="text-xs font-semibold text-sky-100/70 underline-offset-2 hover:underline"
          onClick={openHowTo}
        >
          How to play
        </button>
      </div>
    </aside>
  );
}
