/** Discord invite for interim voice. Override with DISCORD_VOICE_URL or VITE_DISCORD_VOICE_URL. */
export const DEFAULT_DISCORD_VOICE_URL = "https://discord.gg/7cXfQJj9E";

export function resolveDiscordVoiceUrl(raw?: string | null): string {
  const trimmed = (raw ?? "").trim();
  if (trimmed.startsWith("https://")) return trimmed;
  return DEFAULT_DISCORD_VOICE_URL;
}

export function discordVoiceUrlFromEnv(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): string {
  return resolveDiscordVoiceUrl(env.DISCORD_VOICE_URL || env.VITE_DISCORD_VOICE_URL);
}
