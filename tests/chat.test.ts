import { describe, expect, it } from "vitest";
import { allowChatBurst, recentChat, sanitizeChat, TABLE_CHAT_PEEK } from "../shared/chat";

describe("chat moderation", () => {
  it("strips tags, trims, and caps length", () => {
    expect(sanitizeChat("  hello  ")).toBe("hello");
    expect(sanitizeChat("<b>hi</b> there")).toBe("hi there");
    expect(sanitizeChat("<script>x</script>")).toBe("x");
    expect(sanitizeChat("   ")).toBeNull();
    expect(sanitizeChat("a".repeat(300))?.length).toBe(240);
  });

  it("rate-limits bursts", () => {
    let stamps: number[] = [];
    const now = 1_000_000;
    for (let i = 0; i < 8; i++) {
      const next = allowChatBurst(stamps, now + i, 8000, 8);
      expect(next).not.toBeNull();
      stamps = next!;
    }
    expect(allowChatBurst(stamps, now + 9, 8000, 8)).toBeNull();
    expect(allowChatBurst(stamps, now + 9000, 8000, 8)).not.toBeNull();
  });

  it("keeps two lines for the top chat bar", () => {
    expect(TABLE_CHAT_PEEK).toBe(2);
    expect(recentChat([1, 2, 3, 4, 5], TABLE_CHAT_PEEK)).toEqual([4, 5]);
    expect(recentChat(["only"], TABLE_CHAT_PEEK)).toEqual(["only"]);
    expect(recentChat([], TABLE_CHAT_PEEK)).toEqual([]);
  });
});
