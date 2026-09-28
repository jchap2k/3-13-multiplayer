import { isRed, isWild, rankLabel, SUIT_GLYPH } from "@shared/cards";
import type { Card } from "@shared/types";
import { useId, useState } from "react";
import { useA11y } from "../lib/A11yContext";
import { cn } from "../lib/utils";
import { PlayingCard } from "./PlayingCard";
import { Button } from "./ui/button";

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

/** Optional look at the hand someone went out with. Closed until this viewer opens it. */
export function WentOutHandReveal({
  name,
  melds,
  wildRank,
  layout = "chips",
  onOpenChange,
}: {
  name: string;
  melds: Card[][];
  wildRank: number;
  layout?: "cards" | "chips";
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const cards = melds.flat();
  if (cards.length === 0) return null;
  const label = open ? "Hide cards" : "Show cards";
  return (
    <div onClick={(event) => event.stopPropagation()}>
      <Button
        size="sm"
        variant="outline"
        aria-expanded={open}
        aria-controls={panelId}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const next = !open;
          setOpen(next);
          onOpenChange?.(next);
        }}
      >
        {label}
      </Button>
      {open ? (
        <div id={panelId} className="mt-2" role="region" aria-label={`${name}'s cards`}>
          <p className="mb-1 text-xs text-emerald-100/70">{name} went out with</p>
          <div className={cn("flex flex-col gap-2", layout === "cards" ? "items-center" : "items-start")}>
            {melds.map((meld, index) => (
              <div
                key={`${meld[0]?.id ?? "meld"}-${index}`}
                className={cn("flex flex-wrap gap-1", layout === "cards" ? "justify-center" : "")}
              >
                {meld.map((card) =>
                  layout === "cards" ? (
                    <PlayingCard key={card.id} card={card} wildRank={wildRank} size="sm" />
                  ) : (
                    <CardChip key={card.id} card={card} wildRank={wildRank} />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
