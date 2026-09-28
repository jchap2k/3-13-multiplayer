import type { Card } from "@shared/types";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { PlayingCard } from "./PlayingCard";
import { Button } from "./ui/button";

/** Opens the go-out hand popup. Does not insert cards into the table. */
export function ShowWentOutCardsButton({ onShow }: { onShow: () => void }) {
  return (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        size="sm"
        variant="outline"
        aria-haspopup="dialog"
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
 * In-page panel for the hand someone went out with. Fixed over the table
 * (not a browser window) so the layout underneath does not move.
 */
export function WentOutCardsPanel({
  name,
  melds,
  wildRank,
  onClose,
}: {
  name: string;
  melds: Card[][];
  wildRank: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/70 backdrop-blur-[2px]"
        aria-label="Close cards"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="went-out-cards-title"
        className="relative z-10 flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-amber-200/40 bg-[#10261c] text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="overflow-y-auto px-5 pt-6">
          <p id="went-out-cards-title" className="font-display text-3xl font-extrabold leading-tight text-amber-100 sm:text-4xl">
            {name} went out:
          </p>
          <p className="mt-2 text-sm text-emerald-100/70">Last turns continue under this panel.</p>
          <div className="mt-4 flex flex-col items-center gap-2 pb-4">
            {melds.map((meld, index) => (
              <div key={`${meld[0]?.id ?? "meld"}-${index}`} className="flex flex-wrap justify-center gap-1">
                {meld.map((card) => (
                  <PlayingCard key={card.id} card={card} wildRank={wildRank} size="sm" />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t border-white/10 px-4 py-4">
          <Button
            variant="gold"
            size="lg"
            className="h-14 w-full touch-manipulation text-lg"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
