/** Long enough to tap Show cards before the splash steps aside. */
export const WENT_OUT_FLASH_MS = 7000;

export function wentOutFlashKey(
  roomCode: string,
  round: number,
  wentOutId: string | null,
): string | null {
  if (!wentOutId) return null;
  return `${roomCode}:${round}:${wentOutId}`;
}
