/** Stripe Payment Link. Override with DONATE_URL or VITE_DONATE_URL. */
export const DEFAULT_DONATE_URL = "https://buy.stripe.com/3cIcN44b1g2Tcdeh2AdQQ01";

export function resolveDonateUrl(raw?: string | null): string {
  const trimmed = (raw ?? "").trim();
  if (trimmed.startsWith("https://")) return trimmed;
  return DEFAULT_DONATE_URL;
}

export function donateUrlFromEnv(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): string {
  return resolveDonateUrl(env.DONATE_URL || env.VITE_DONATE_URL);
}

/** v1 tip-to-forget uses the same Stripe Payment Link as Support hosting. */
export function forgetTipUrl(raw?: string | null): string {
  return resolveDonateUrl(raw);
}
