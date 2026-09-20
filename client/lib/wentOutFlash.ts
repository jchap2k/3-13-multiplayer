export const WENT_OUT_FLASH_MS = 4200;

export function wentOutFlashKey(
  roomCode: string,
  round: number,
  wentOutId: string | null,
): string | null {
  if (!wentOutId) return null;
  return `${roomCode}:${round}:${wentOutId}`;
}
