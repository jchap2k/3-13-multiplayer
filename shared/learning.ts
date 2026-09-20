export const LEARNING_STORAGE_KEY = "tt-learning";
export const LEARNING_LABEL = "Learning — don't write to Stats";
export const LEARNING_HINT =
  "Don't count this match in Stats. Opening How to play turns this on. Locked when the host starts.";

/** Explicit seat flag. Default off — matches write to Stats unless the player opts out. */
export function isLearningMode(prefs?: unknown): boolean {
  if (typeof prefs === "boolean") return prefs;
  if (!prefs || typeof prefs !== "object") return false;
  return Boolean((prefs as { learning?: boolean }).learning);
}

export function parseLearningFlag(raw: string | null | undefined): boolean {
  if (raw == null || raw === "") return false;
  const value = raw.trim().toLowerCase();
  if (value === "1" || value === "true" || value === "on") return true;
  if (value === "0" || value === "false" || value === "off") return false;
  try {
    const parsed = JSON.parse(raw) as { learning?: boolean } | boolean;
    if (typeof parsed === "boolean") return parsed;
    return Boolean(parsed?.learning);
  } catch {
    return false;
  }
}
