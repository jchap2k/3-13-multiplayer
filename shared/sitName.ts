export const SIT_NAME_MAX = 24;
export const SIT_NAME_KEY = "tt-player-name";
export const NEED_SIT_NAME = "Need a name to join.";

export function normalizeSitName(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim().slice(0, SIT_NAME_MAX);
}

export function hasSitName(raw: string | null | undefined): boolean {
  return normalizeSitName(raw).length > 0;
}

/** Join stays hittable; empty name opens a prompt instead of disabling the button. */
export function joinNeedsNamePrompt(raw: string | null | undefined): boolean {
  return !hasSitName(raw);
}
