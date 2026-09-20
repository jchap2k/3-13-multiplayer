export const SOLO_START_BOT_NOTE = "Added a bot so you can play";

export function shouldAutoAddSoloBot(seats: { isBot: boolean }[]): boolean {
  const humans = seats.filter((seat) => !seat.isBot).length;
  const bots = seats.filter((seat) => seat.isBot).length;
  return humans === 1 && bots === 0;
}

export function isSoloStartBotToast(message: string): boolean {
  return message.includes(SOLO_START_BOT_NOTE);
}
