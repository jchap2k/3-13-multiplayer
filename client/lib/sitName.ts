import { hasSitName, normalizeSitName, SIT_NAME_KEY, SIT_NAME_MAX } from "@shared/sitName";

export { hasSitName, normalizeSitName, SIT_NAME_KEY, SIT_NAME_MAX };

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readSitName(raw?: string | null): string {
  const source = raw !== undefined ? raw : storage()?.getItem(SIT_NAME_KEY);
  return normalizeSitName(source);
}

export function writeSitName(raw: string): string {
  const next = normalizeSitName(raw);
  const store = storage();
  if (next) store?.setItem(SIT_NAME_KEY, next);
  else store?.removeItem(SIT_NAME_KEY);
  return next;
}

export function clipSitNameInput(raw: string): string {
  return raw.slice(0, SIT_NAME_MAX);
}
