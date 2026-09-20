/** Remaining last-lick seats, continuing the same way around the table after a go-out. */
export function lastTurnSeatIds(seatIds: string[], wentOutId: string): string[] {
  const n = seatIds.length;
  const from = seatIds.indexOf(wentOutId);
  if (n < 2 || from < 0) return seatIds.filter((id) => id !== wentOutId);
  const order: string[] = [];
  for (let step = 1; step < n; step += 1) {
    const id = seatIds[(from + step) % n];
    if (id) order.push(id);
  }
  return order;
}