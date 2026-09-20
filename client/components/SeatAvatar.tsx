import { AVATAR_META, isAvatarId, seatAccent, type AvatarId } from "@shared/avatars";
import { cn } from "../lib/utils";

function Glyph({ id }: { id: AvatarId }) {
  const common = { viewBox: "0 0 32 32", "aria-hidden": true as const, className: "h-full w-full" };
  switch (id) {
    case "oak":
      return (
        <svg {...common}>
          <path d="M16 6c-4 3-7 7-6 11 2 1 4 1 6 1s4 0 6-1c1-4-2-8-6-11Z" fill="#166534" />
          <path d="M15 17h2v9h-2z" fill="#3f2a14" />
        </svg>
      );
    case "fox":
      return (
        <svg {...common}>
          <path d="M7 14 12 8l4 4 4-4 5 6-2 8H9l-2-8Z" fill="#c2410c" />
          <circle cx="13" cy="16" r="1.2" fill="#fff7ed" />
          <circle cx="19" cy="16" r="1.2" fill="#fff7ed" />
        </svg>
      );
    case "kite":
      return (
        <svg {...common}>
          <path d="M16 5 25 16 16 27 7 16Z" fill="#0369a1" />
          <path d="M16 16v10" stroke="#7dd3fc" strokeWidth="1.4" />
        </svg>
      );
    case "wolf":
      return (
        <svg {...common}>
          <path d="M8 13 12 7l4 4 4-4 4 6-2 10H10L8 13Z" fill="#334155" />
          <circle cx="13.5" cy="16" r="1.1" fill="#e2e8f0" />
          <circle cx="18.5" cy="16" r="1.1" fill="#e2e8f0" />
        </svg>
      );
    case "fern":
      return (
        <svg {...common}>
          <path d="M16 6c0 8-7 9-7 16 4-2 7-6 7-10 0 4 3 8 7 10 0-7-7-8-7-16Z" fill="#15803d" />
        </svg>
      );
    case "hawk":
      return (
        <svg {...common}>
          <path d="M6 18c5-8 8-11 10-11s5 3 10 11c-4 2-7 3-10 3s-6-1-10-3Z" fill="#92400e" />
          <path d="M16 10v4" stroke="#fde68a" strokeWidth="1.4" />
        </svg>
      );
    case "river":
      return (
        <svg {...common}>
          <path d="M6 12c4 3 6-3 10 0s6-3 10 0" fill="none" stroke="#0284c7" strokeWidth="2.2" />
          <path d="M6 19c4 3 6-3 10 0s6-3 10 0" fill="none" stroke="#38bdf8" strokeWidth="2.2" />
        </svg>
      );
    case "lantern":
      return (
        <svg {...common}>
          <rect x="11" y="9" width="10" height="14" rx="2" fill="#b45309" />
          <path d="M13 9V7h6v2" stroke="#fde68a" strokeWidth="1.6" />
          <path d="M13 14h6" stroke="#fbbf24" strokeWidth="1.6" />
        </svg>
      );
    case "cat":
      return (
        <svg {...common}>
          <path d="M10 13 13 6l3 6 3-6 3 7v10H10V13Z" fill="#57534e" />
          <path d="M22 20c3.2.4 5 3 4 7" fill="none" stroke="#57534e" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="14" cy="16" r="1.1" fill="#fde68a" />
          <circle cx="18" cy="16" r="1.1" fill="#fde68a" />
        </svg>
      );
    case "tiger":
      return (
        <svg {...common}>
          <path d="M9 13 13 6l3 5 3-5 4 7v10H9V13Z" fill="#c2410c" />
          <path
            d="M12.5 12v9M16 11.5v10M19.5 12v9"
            stroke="#7c2d12"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <path
            d="M23 20c3.4.5 5.2 3.2 4 7"
            fill="none"
            stroke="#c2410c"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="14" cy="16.5" r="1.1" fill="#fde68a" />
          <circle cx="18" cy="16.5" r="1.1" fill="#fde68a" />
        </svg>
      );
  }
}

export function SeatAvatar({
  avatar,
  seatIndex,
  initials,
  size = "md",
  current = false,
}: {
  avatar?: string | null;
  seatIndex: number;
  initials?: string;
  size?: "sm" | "md";
  current?: boolean;
}) {
  const id = isAvatarId(avatar) ? avatar : null;
  const accent = seatAccent(seatIndex);
  return (
    <span
      className={cn(
        "seat-avatar inline-flex shrink-0 items-center justify-center rounded-full bg-[#0b1f18]",
        size === "sm" ? "h-7 w-7" : "h-9 w-9",
      )}
      style={{
        boxShadow: `0 0 0 2px ${accent.ring}${current ? ", 0 0 0 5px rgba(251,191,36,0.28)" : ""}`,
        background: accent.wash,
      }}
      title={id ? (AVATAR_META.find((item) => item.id === id)?.label ?? id) : "No avatar yet"}
      aria-hidden
    >
      <span className={size === "sm" ? "h-5 w-5" : "h-6 w-6"}>
        {id ? (
          <Glyph id={id} />
        ) : (
          <svg viewBox="0 0 32 32" aria-hidden className="h-full w-full text-emerald-100/50">
            <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeDasharray="3 2" strokeWidth="1.6" />
          </svg>
        )}
      </span>
      {initials ? <span className="sr-only">{initials}</span> : null}
    </span>
  );
}

export function AvatarPicker({
  value,
  onChange,
  taken = [],
}: {
  value: AvatarId | null;
  onChange: (avatar: AvatarId) => void;
  taken?: { id: string; name: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/80">Piece</p>
      <p className="mt-1 text-xs text-emerald-100/50">
        One of each token at the table — like Monopoly. Grab one, or leave it in the box; leftovers
        are handed out at Start.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {AVATAR_META.map((item, index) => {
          const holder = taken.find((row) => row.id === item.id);
          const selected = item.id === value && !holder;
          const disabled = Boolean(holder);
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(item.id)}
              title={holder ? `Taken by ${holder.name}` : item.label}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold",
                selected ? "bg-amber-400/15 text-amber-50" : "bg-black/20 text-emerald-100/70",
                disabled ? "cursor-not-allowed opacity-35 grayscale" : "",
              )}
              aria-pressed={selected}
              aria-disabled={disabled}
            >
              <SeatAvatar avatar={item.id} seatIndex={index} current={selected} />
              {holder ? "Taken" : item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}