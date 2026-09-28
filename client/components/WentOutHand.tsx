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

/** Popup of the hand someone went out with. Sits over the table and does not reflow it. */
export function WentOutCardsModal({
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="presentation">
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
        className="relative z-10 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-amber-200/40 bg-[#10261c] px-5 py-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200/80">
          Went out
        </p>
        <p id="went-out-cards-title" className="font-display mt-2 text-2xl font-extrabold text-amber-100 sm:text-3xl">
          {name}&apos;s cards
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          {melds.map((meld, index) => (
            <div key={`${meld[0]?.id ?? "meld"}-${index}`} className="flex flex-wrap justify-center gap-1">
              {meld.map((card) => (
                <PlayingCard key={card.id} card={card} wildRank={wildRank} size="sm" />
              ))}
            </div>
          ))}
        </div>
        <Button className="mt-5" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>,
    document.body,
  );
}
