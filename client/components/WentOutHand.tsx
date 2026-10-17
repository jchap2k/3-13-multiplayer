import { Flag, X } from "lucide-react";
import type { Card } from "@shared/types";
import { PlayingCard } from "./PlayingCard";
import { Button } from "./ui/button";

/** Brings the went-out banner back after it was dismissed. */
export function ShowWentOutCardsButton({ onShow }: { onShow: () => void }) {
  return (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        size="sm"
        variant="outline"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onShow();
        }}
      >
        Show cards
      </Button>
    </div>
  );
}

/**
 * Non-blocking banner. Piles and the hand stay visible underneath.
 * Dismiss is an X, not a Close button over the table.
 */
export function WentOutBanner({
  name,
  melds,
  wildRank,
  detail,
  onDismiss,
}: {
  name: string;
  melds: Card[][] | null;
  wildRank: number;
  detail: string;
  onDismiss: () => void;
}) {
  return (
    <div className="went-out-banner" role="status" aria-live="polite">
      <Flag className="h-4 w-4 shrink-0 text-amber-200" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-extrabold leading-tight text-amber-50 sm:text-xl">
          {name} went out
        </p>
        <p className="text-xs leading-snug text-amber-100/75">{detail}</p>
      </div>
      {melds && melds.length > 0 ? (
        <div className="went-out-melds flex items-center justify-end gap-1">
          {melds.map((meld, index) => (
            <div key={`${meld[0]?.id ?? "meld"}-${index}`} className="flex gap-0.5">
              {meld.map((card) => (
                <PlayingCard key={card.id} card={card} wildRank={wildRank} size="xs" />
              ))}
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="shrink-0 rounded-full p-1 text-amber-100/80 hover:bg-black/25"
        aria-label="Dismiss went out"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
