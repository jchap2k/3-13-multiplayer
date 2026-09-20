import { RANK_LABEL, SUIT_GLYPH, isRed, isWild, isJoker } from "@shared/cards";
import type { Card } from "@shared/types";
import { useA11y } from "../lib/A11yContext";
import { cn } from "../lib/utils";

const sizeClass = {
  sm: "h-[4.4rem] w-[3.15rem] text-[0.95rem]",
  md: "h-[6.1rem] w-[4.35rem] text-[1.25rem]",
  hand: "h-[6.5rem] w-[4.7rem] text-[1.3rem] sm:h-[7rem] sm:w-[5rem] sm:text-[1.4rem]",
  lg: "h-[7.2rem] w-[5.1rem] text-[1.45rem]",
};

export function PlayingCard({
  card,
  wildRank,
  selected = false,
  dimmed = false,
  dragging = false,
  dropTarget = false,
  grab = false,
  goOut = false,
  largePips = false,
  onClick,
  size = "md",
}: {
  card: Card;
  wildRank: number;
  selected?: boolean;
  dimmed?: boolean;
  dragging?: boolean;
  dropTarget?: boolean;
  grab?: boolean;
  goOut?: boolean;
  largePips?: boolean;
  onClick?: () => void;
  size?: keyof typeof sizeClass;
}) {
  const { prefs } = useA11y();
  const wild = isWild(card, wildRank);
  const markWild = wild && prefs.markWilds;
  const red = isRed(card);
  const joker = isJoker(card);
  const rank = joker ? "★" : RANK_LABEL[card.rank];
  const suit = SUIT_GLYPH[card.suit];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "card-face relative shrink-0 touch-none select-none overflow-hidden rounded-[0.7rem] border border-stone-300/90",
        sizeClass[size],
        grab ? "cursor-grab active:cursor-grabbing" : onClick ? "cursor-pointer" : "cursor-default",
        !dragging && !selected && "transition-transform duration-150",
        !dragging && !selected && onClick && !grab && "hover:-translate-y-1",
        selected &&
          "z-20 -translate-y-3 scale-[1.04] ring-4 ring-sky-200 shadow-[0_0_0_3px_#0284c7]",
        !selected && markWild && "wild-card ring-[3px] ring-amber-400",
        !selected && goOut && "ring-[3px] ring-emerald-300",
        dropTarget && "ring-4 ring-sky-400",
        dimmed && "opacity-40",
        dragging && "opacity-35 shadow-none",
        red || joker ? (largePips ? "text-red-800" : "text-red-600") : largePips ? "text-neutral-950" : "text-neutral-900",
      )}
    >
      <span
        className={cn(
          "absolute left-1.5 top-1 text-left leading-none",
          largePips
            ? "text-[0.98em] font-black tracking-tight sm:text-[1.08em] [text-shadow:0_1px_0_rgba(255,255,255,0.9)]"
            : "text-[0.58em] font-extrabold leading-[1.05]",
        )}
      >
        {rank}
        <span className="block text-[0.95em]">{suit}</span>
      </span>
      <span
        className={cn(
          "absolute bottom-1 right-1.5 rotate-180 text-left leading-none",
          largePips
            ? "text-[0.98em] font-black tracking-tight sm:text-[1.08em] [text-shadow:0_1px_0_rgba(255,255,255,0.9)]"
            : "text-[0.58em] font-extrabold leading-[1.05]",
        )}
      >
        {rank}
        <span className="block text-[0.95em]">{suit}</span>
      </span>
      <span
        className={cn(
          "flex h-full items-center justify-center leading-none",
          largePips ? "text-[1.75em] font-black" : "text-[1.45em]",
        )}
      >
        {suit}
      </span>
      {markWild ? (
        <span className="absolute right-1 top-1 rounded-full bg-amber-400 px-1 py-px text-[0.42em] font-extrabold tracking-wide text-[#3b2200]">
          WILD
        </span>
      ) : null}
      {selected ? (
        <span className="absolute inset-x-1 bottom-0.5 rounded-sm bg-sky-600 px-1 text-center text-[0.38em] font-extrabold tracking-wide text-white">
          SELECTED
        </span>
      ) : goOut ? (
        <span className="absolute inset-x-1 bottom-0.5 rounded-sm bg-emerald-700 px-1 text-center text-[0.38em] font-extrabold tracking-wide text-white">
          GO OUT
        </span>
      ) : null}
    </button>
  );
}

export function CardBack({
  label,
  size = "md",
  onClick,
}: {
  label?: string;
  size?: keyof typeof sizeClass;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "card-back relative shrink-0 overflow-hidden rounded-[0.7rem] border-2 border-[#93c5fd]/50 text-white",
        sizeClass[size],
        onClick ? "cursor-pointer hover:-translate-y-1" : "cursor-default",
      )}
    >
      <span className="relative z-10 flex h-full flex-col items-center justify-center">
        <span className="text-[0.7em] font-extrabold tracking-[0.18em] opacity-90">313</span>
        {label ? <span className="text-[0.5em] uppercase tracking-wide opacity-80">{label}</span> : null}
      </span>
    </button>
  );
}

/** Outline of a scooped upcard — not a real pile card. */
export function DiscardGhost({ card }: { card: Card }) {
  const red = isRed(card);
  const joker = isJoker(card);
  const rank = joker ? "★" : RANK_LABEL[card.rank];
  const suit = SUIT_GLYPH[card.suit];
  return (
    <div
      className={cn(
        "discard-ghost pointer-events-none relative flex shrink-0 select-none flex-col overflow-hidden rounded-[0.7rem]",
        sizeClass.md,
        red || joker ? "text-red-300" : "text-amber-100",
      )}
      aria-hidden
    >
      <span className="absolute left-1.5 top-1 text-left text-[0.58em] font-extrabold leading-[1.05]">
        {rank}
        <span className="block text-[0.95em]">{suit}</span>
      </span>
      <span className="flex h-full items-center justify-center text-[1.45em] leading-none">{suit}</span>
      <span className="absolute bottom-1 right-1.5 rotate-180 text-left text-[0.58em] font-extrabold leading-[1.05]">
        {rank}
        <span className="block text-[0.95em]">{suit}</span>
      </span>
    </div>
  );
}
