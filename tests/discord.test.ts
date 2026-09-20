import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISCORD_VOICE_URL,
  discordVoiceUrlFromEnv,
  resolveDiscordVoiceUrl,
} from "../shared/discord";
import { createRoom, toClientView } from "../server/room";

describe("discord voice link", () => {
  it("defaults to John's Discord invite", () => {
    expect(DEFAULT_DISCORD_VOICE_URL).toBe("https://discord.gg/7cXfQJj9E");
    expect(resolveDiscordVoiceUrl(undefined)).toBe(DEFAULT_DISCORD_VOICE_URL);
    expect(resolveDiscordVoiceUrl("")).toBe(DEFAULT_DISCORD_VOICE_URL);
    expect(resolveDiscordVoiceUrl("not-a-url")).toBe(DEFAULT_DISCORD_VOICE_URL);
  });

  it("prefers DISCORD_VOICE_URL then VITE_DISCORD_VOICE_URL", () => {
    expect(discordVoiceUrlFromEnv({ DISCORD_VOICE_URL: "https://discord.gg/override" })).toBe(
      "https://discord.gg/override",
    );
    expect(discordVoiceUrlFromEnv({ VITE_DISCORD_VOICE_URL: "https://discord.gg/vite" })).toBe(
      "https://discord.gg/vite",
    );
    expect(
      discordVoiceUrlFromEnv({
        DISCORD_VOICE_URL: "https://discord.gg/first",
        VITE_DISCORD_VOICE_URL: "https://discord.gg/second",
      }),
    ).toBe("https://discord.gg/first");
    expect(discordVoiceUrlFromEnv({})).toBe(DEFAULT_DISCORD_VOICE_URL);
  });

  it("puts the resolved URL on the client view", () => {
    const view = toClientView(createRoom("TALK-1"), "guest");
    expect(view.discordVoiceUrl).toBe(DEFAULT_DISCORD_VOICE_URL);
  });
});
