import { describe, expect, it } from "vitest";
import { DEFAULT_DONATE_URL, donateUrlFromEnv, forgetTipUrl, resolveDonateUrl } from "../shared/donate";
import { createRoom, toClientView } from "../server/room";

describe("donate link", () => {
  it("defaults to John's Stripe Payment Link", () => {
    expect(DEFAULT_DONATE_URL).toBe("https://buy.stripe.com/3cIcN44b1g2Tcdeh2AdQQ01");
    expect(resolveDonateUrl(undefined)).toBe(DEFAULT_DONATE_URL);
    expect(resolveDonateUrl("")).toBe(DEFAULT_DONATE_URL);
    expect(resolveDonateUrl("not-a-url")).toBe(DEFAULT_DONATE_URL);
  });

  it("prefers DONATE_URL then VITE_DONATE_URL", () => {
    expect(donateUrlFromEnv({ DONATE_URL: "https://buy.stripe.com/override" })).toBe(
      "https://buy.stripe.com/override",
    );
    expect(donateUrlFromEnv({ VITE_DONATE_URL: "https://buy.stripe.com/vite" })).toBe(
      "https://buy.stripe.com/vite",
    );
    expect(
      donateUrlFromEnv({
        DONATE_URL: "https://buy.stripe.com/first",
        VITE_DONATE_URL: "https://buy.stripe.com/second",
      }),
    ).toBe("https://buy.stripe.com/first");
    expect(donateUrlFromEnv({})).toBe(DEFAULT_DONATE_URL);
    expect(forgetTipUrl(undefined)).toBe(DEFAULT_DONATE_URL);
    expect(forgetTipUrl("https://buy.stripe.com/tip")).toBe("https://buy.stripe.com/tip");
  });

  it("puts the resolved URL on the client view", () => {
    const view = toClientView(createRoom("GIFT-1"), "guest");
    expect(view.donateUrl).toBe(DEFAULT_DONATE_URL);
  });
});
