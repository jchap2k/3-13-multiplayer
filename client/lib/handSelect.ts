export function shouldClearHandSelection(args: {
  selected: string | null;
  yourTurn: boolean;
  turnPhase: string | null;
  handIds: string[];
  idleAutoMove?: boolean;
  currentPlayerId?: string | null;
  previousPlayerId?: string | null;
}): boolean {
  if (!args.selected) return false;
  if (!args.yourTurn) return true;
  if (args.turnPhase !== "discard") return true;
  if (!args.handIds.includes(args.selected)) return true;
  if (args.idleAutoMove) return true;
  if (
    args.previousPlayerId &&
    args.currentPlayerId &&
    args.previousPlayerId !== args.currentPlayerId
  ) {
    return true;
  }
  return false;
}
