import { rankLabel, wildSpoken } from "@shared/cards";

export function WildBanner({
  round,
  wildRank,
  dealCount,
  jokers,
  suddenDeath = false,
}: {
  round: number;
  wildRank: number;
  dealCount: number;
  jokers: boolean;
  suddenDeath?: boolean;
}) {
  return (
    <div className="wild-banner mt-3 rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-500/25 via-amber-300/10 to-emerald-950/50 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
      <p className="font-display text-lg font-extrabold leading-tight tracking-tight text-amber-50 sm:text-xl">
        {suddenDeath
          ? `Sudden death — ${wildSpoken(wildRank)} are wild`
          : `Round ${round} of 11 — ${wildSpoken(wildRank)} are wild`}
      </p>
      <p className="mt-0.5 text-sm text-amber-100/80">
        Deal {dealCount}
        {jokers ? " · jokers stay wild too" : ""}
        {" · yellow ring = wild (Accessibility → Mark wilds)"}
      </p>
    </div>
  );
}

export function WildToast({
  open,
  round,
  wildRank,
  dealCount,
  jokers,
  suddenDeath = false,
  onDismiss,
}: {
  open: boolean;
  round: number;
  wildRank: number;
  dealCount: number;
  jokers: boolean;
  suddenDeath?: boolean;
  onDismiss: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      onClick={onDismiss}
      role="status"
      aria-live="polite"
    >
      <div
        className="wild-toast w-full max-w-sm rounded-3xl border border-amber-200/35 bg-[#10261c] px-6 py-8 text-center text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200/80">
          Now dealing
        </p>
        <p className="font-display mt-3 text-7xl font-extrabold leading-none text-amber-300">
          {rankLabel(wildRank)}
        </p>
        <p className="font-display mt-3 text-3xl font-extrabold tracking-tight">
          {suddenDeath ? "Sudden death" : `Round ${round}`}
        </p>
        <p className="mt-2 text-xl font-bold text-amber-200">
          {wildSpoken(wildRank)} are wild
        </p>
        <p className="mt-2 text-sm text-emerald-100/75">
          {dealCount} cards each
          {jokers ? " · jokers are always wild" : ""}
        </p>
        <button
          type="button"
          className="mt-6 text-sm font-semibold text-amber-100/80 underline-offset-2 hover:underline"
          onClick={onDismiss}
        >
          Play
        </button>
      </div>
    </div>
  );
}
