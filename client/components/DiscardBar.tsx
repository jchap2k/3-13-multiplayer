import type { Ref } from "react";
import { formatCard } from "@shared/cards";
import type { Card } from "@shared/types";
import { DISCARD_HINT } from "../lib/handSelect";
import { PlayingCard } from "./PlayingCard";
import { Button } from "./ui/button";

export function DiscardBar({
  card,
  wildRank,
  enabled,
  goesOut,
  onDiscard,
  onDeselect,
  buttonRef,
}: {
  card: Card | null;
  wildRank: number;
  enabled: boolean;
  goesOut: boolean;
  onDiscard: () => void;
  onDeselect: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const label = card ? formatCard(card) : null;
  return (
    <div className="discard-bar" role="region" aria-label="Discard">
      <div className="discard-bar-card">
        {card ? (
          <PlayingCard card={card} wildRank={wildRank} size="sm" />
        ) : (
          <div className="discard-bar-empty" aria-hidden />
        )}
        <p className="discard-bar-selected-label">{label ? `SELECTED ${label}` : "None"}</p>
      </div>
      <p className="discard-bar-hint">{DISCARD_HINT}</p>
      <Button
        variant="outline"
        className="discard-deselect h-11 min-w-[6.5rem] touch-manipulation"
        disabled={!card}
        onClick={onDeselect}
      >
        Deselect
      </Button>
      <Button
        ref={buttonRef}
        variant="gold"
        className="discard-commit h-12 min-w-[9.5rem] touch-manipulation px-4 text-base font-extrabold"
        disabled={!enabled || !card}
        title={goesOut ? "This discard goes out. The rest of the hand is legal melds." : undefined}
        onClick={onDiscard}
      >
        {label ? `Discard ${label}` : "Discard"}
      </Button>
    </div>
  );
}
