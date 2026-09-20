export function botPlayBadge(player: {
  isBot: boolean;
  botPlay?: boolean;
  connected: boolean;
}): string {
  if (player.isBot || !player.botPlay) return "";
  return player.connected ? "auto-play" : "away+auto";
}

export function isStandInToast(message: string): boolean {
  return (
    /Auto-play on for/.test(message) ||
    /Auto-play off/.test(message) ||
    /Auto-play moved for/.test(message)
  );
}