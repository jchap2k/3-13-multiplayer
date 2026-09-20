export { isLearningMode } from "@shared/learning";

export const TUTORIAL_STORAGE_KEY = "tt-tutorial";
/** First N regulation hands can show the coach overlay (deal 3 through 7). */
export const COACH_HANDS = 5;

export interface TutorialPrefs {
  /** Rules walkthrough finished or skipped. First-visit prompt hides. */
  done: boolean;
  /** Contextual tips on the first COACH_HANDS hands. Does not play for them. */
  coach: boolean;
}

export const DEFAULT_TUTORIAL: TutorialPrefs = {
  done: false,
  coach: false,
};

function readStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadTutorial(raw?: string | null): TutorialPrefs {
  const source = raw ?? readStorage()?.getItem(TUTORIAL_STORAGE_KEY);
  if (!source) return { ...DEFAULT_TUTORIAL };
  try {
    const parsed = JSON.parse(source) as Partial<TutorialPrefs>;
    return {
      done: Boolean(parsed.done),
      coach: Boolean(parsed.coach),
    };
  } catch {
    return { ...DEFAULT_TUTORIAL };
  }
}

export function saveTutorial(prefs: TutorialPrefs) {
  readStorage()?.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(prefs));
}

export function isFirstVisit(prefs: TutorialPrefs): boolean {
  return !prefs.done;
}

export function coachActive(
  prefs: TutorialPrefs,
  round: number,
  phase: "lobby" | "playing" | "round_end" | "match_end",
): boolean {
  if (!prefs.coach) return false;
  if (phase !== "playing" && phase !== "round_end") return false;
  return round >= 1 && round <= COACH_HANDS;
}
