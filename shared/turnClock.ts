/** Human idle auto-move deadline. Disconnects still use the short absent timer. */
export const HUMAN_TURN_MS = 180_000;
export const HUMAN_TURN_SECONDS = HUMAN_TURN_MS / 1000;

export function formatTurnClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
