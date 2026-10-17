/**
 * One row through 7 cards. After that, two even rows
 * (a 14-card round-13 hand is 7 + 7).
 */
export function handRowColumns(count: number): number {
  if (count <= 1) return 1;
  if (count <= 7) return count;
  return Math.ceil(count / 2);
}
