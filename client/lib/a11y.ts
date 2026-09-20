export const A11Y_STORAGE_KEY = "tt-a11y";
/** Hold still this long to discard when long-press is on. */
export const LONG_PRESS_MS = 550;
/** Second tap inside this window counts as a double-tap. */
export const DOUBLE_TAP_MS = 400;

export interface A11yPrefs {
  largePips: boolean;
  markWilds: boolean;
  doubleDiscard: boolean;
  longDiscard: boolean;
  turnSound: boolean;
  chatOverlay: boolean;
}

export const DEFAULT_A11Y: A11yPrefs = {
  largePips: true,
  markWilds: true,
  doubleDiscard: false,
  longDiscard: false,
  turnSound: true,
  chatOverlay: true,
};

function readFlag(parsed: Partial<A11yPrefs>, key: keyof A11yPrefs): boolean {
  if (parsed[key] === undefined) return DEFAULT_A11Y[key];
  return Boolean(parsed[key]);
}

function readStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadA11y(raw?: string | null): A11yPrefs {
  const source = raw ?? readStorage()?.getItem(A11Y_STORAGE_KEY);
  if (!source) return { ...DEFAULT_A11Y };
  try {
    const parsed = JSON.parse(source) as Partial<A11yPrefs>;
    return {
      largePips: readFlag(parsed, "largePips"),
      markWilds: readFlag(parsed, "markWilds"),
      doubleDiscard: readFlag(parsed, "doubleDiscard"),
      longDiscard: readFlag(parsed, "longDiscard"),
      turnSound: readFlag(parsed, "turnSound"),
      chatOverlay: readFlag(parsed, "chatOverlay"),
    };
  } catch {
    return { ...DEFAULT_A11Y };
  }
}

export function saveA11y(prefs: A11yPrefs) {
  readStorage()?.setItem(A11Y_STORAGE_KEY, JSON.stringify(prefs));
}

export function isDoubleTap(
  sameCard: boolean,
  msSinceLastTap: number | null,
  windowMs = DOUBLE_TAP_MS,
): boolean {
  if (!sameCard || msSinceLastTap == null) return false;
  return msSinceLastTap <= windowMs;
}

export function gestureDiscardKind(
  cardId: string,
  goOutIds: string[],
): "goOut" | "discard" {
  return goOutIds.includes(cardId) ? "goOut" : "discard";
}

export type CardReleaseAction = "none" | "select" | "deselect" | "gestureDiscard";

export function resolveCardRelease(args: {
  moved: boolean;
  selectable: boolean;
  alreadySelected: boolean;
  doubleDiscard: boolean;
  sameAsLastTap: boolean;
  msSinceLastTap: number | null;
  longPressFired: boolean;
}): CardReleaseAction {
  if (args.moved) return "none";
  if (args.longPressFired) return "none";
  if (!args.selectable) return "none";
  if (args.doubleDiscard && isDoubleTap(args.sameAsLastTap, args.msSinceLastTap)) {
    return "gestureDiscard";
  }
  if (args.alreadySelected) return "deselect";
  return "select";
}
