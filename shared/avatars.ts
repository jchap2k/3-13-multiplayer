export const AVATAR_IDS = [
  "oak",
  "fox",
  "kite",
  "wolf",
  "fern",
  "hawk",
  "river",
  "lantern",
  "cat",
  "tiger",
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export const AVATAR_META: { id: AvatarId; label: string }[] = [
  { id: "oak", label: "Oak" },
  { id: "fox", label: "Fox" },
  { id: "kite", label: "Kite" },
  { id: "wolf", label: "Wolf" },
  { id: "fern", label: "Fern" },
  { id: "hawk", label: "Hawk" },
  { id: "river", label: "River" },
  { id: "lantern", label: "Lantern" },
  { id: "cat", label: "Cat" },
  { id: "tiger", label: "Tiger" },
];

export const SEAT_ACCENTS = [
  { ring: "#fbbf24", wash: "rgba(251, 191, 36, 0.22)" },
  { ring: "#38bdf8", wash: "rgba(56, 189, 248, 0.22)" },
  { ring: "#f472b6", wash: "rgba(244, 114, 182, 0.22)" },
  { ring: "#a3e635", wash: "rgba(163, 230, 53, 0.22)" },
  { ring: "#c084fc", wash: "rgba(192, 132, 252, 0.22)" },
  { ring: "#fb923c", wash: "rgba(251, 146, 60, 0.22)" },
  { ring: "#2dd4bf", wash: "rgba(45, 212, 191, 0.22)" },
  { ring: "#f87171", wash: "rgba(248, 113, 113, 0.22)" },
] as const;

export function isAvatarId(raw: string | null | undefined): raw is AvatarId {
  return Boolean(raw && (AVATAR_IDS as readonly string[]).includes(raw));
}

export function normalizeAvatar(raw: string | null | undefined, fallback: AvatarId = "oak"): AvatarId {
  return isAvatarId(raw) ? raw : fallback;
}

export function takenAvatars(used: Iterable<string | null | undefined>): Set<AvatarId> {
  const taken = new Set<AvatarId>();
  for (const id of used) {
    if (isAvatarId(id)) taken.add(id);
  }
  return taken;
}

/** Next free token, or null when the room’s piece pool is empty. */
export function unusedAvatar(used: Iterable<string | null | undefined>): AvatarId | null {
  const taken = takenAvatars(used);
  return AVATAR_IDS.find((id) => !taken.has(id)) ?? null;
}

/** Claim the requested face only if it is still in the box. */
export function claimIfFree(
  requested: string | null | undefined,
  used: Iterable<string | null | undefined>,
): AvatarId | null {
  return isAvatarId(requested) && !takenAvatars(used).has(requested) ? requested : null;
}

export function seatAccent(index: number) {
  return SEAT_ACCENTS[((index % SEAT_ACCENTS.length) + SEAT_ACCENTS.length) % SEAT_ACCENTS.length]!;
}