import { isAvatarId, type AvatarId } from "@shared/avatars";

const AVATAR_KEY = "tt-player-avatar";

export function readAvatar(): AvatarId | null {
  try {
    const raw = localStorage.getItem(AVATAR_KEY);
    return isAvatarId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeAvatar(avatar: AvatarId) {
  try {
    localStorage.setItem(AVATAR_KEY, avatar);
  } catch {
    /* ignore quota */
  }
}