import { describe, expect, it } from "vitest";
import { howtoMentions, HOW_TO_COACH_OFFER, HOW_TO_PAGES } from "../shared/howto";
import { isLearningMode } from "../shared/learning";
import {
  COACH_HANDS,
  DEFAULT_TUTORIAL,
  coachActive,
  isFirstVisit,
  loadTutorial,
} from "../client/lib/tutorial";

describe("tutorial prefs", () => {
  it("starts undone with coach off so experienced players are not blocked", () => {
    expect(DEFAULT_TUTORIAL).toEqual({ done: false, coach: false });
    expect(loadTutorial(null)).toEqual(DEFAULT_TUTORIAL);
    expect(loadTutorial("{")).toEqual(DEFAULT_TUTORIAL);
    expect(isFirstVisit(DEFAULT_TUTORIAL)).toBe(true);
    expect(isFirstVisit({ done: true, coach: true })).toBe(false);
    expect(loadTutorial(JSON.stringify({ done: true, coach: true }))).toEqual({
      done: true,
      coach: true,
    });
  });

  it("limits the coach overlay to the first five regulation hands", () => {
    expect(COACH_HANDS).toBe(5);
    const on = { done: true, coach: true };
    expect(coachActive(on, 1, "playing")).toBe(true);
    expect(coachActive(on, 5, "round_end")).toBe(true);
    expect(coachActive(on, 6, "playing")).toBe(false);
    expect(coachActive(on, 1, "lobby")).toBe(false);
    expect(coachActive({ done: true, coach: false }, 1, "playing")).toBe(false);
    expect(isLearningMode(DEFAULT_TUTORIAL)).toBe(false);
    expect(isLearningMode({ learning: false })).toBe(false);
    expect(isLearningMode({ learning: true })).toBe(true);
    expect(isLearningMode(true)).toBe(true);
    expect(isLearningMode({ done: true, coach: true })).toBe(false);
  });
});

describe("how to play copy", () => {
  it("covers the locked house rules in a short walkthrough", () => {
    expect(HOW_TO_PAGES).toHaveLength(4);
    const text = howtoMentions();
    expect(text).toMatch(/11 hands/);
    expect(text).toMatch(/3s/);
    expect(text).toMatch(/Kings/);
    expect(text).toMatch(/A-2-3/);
    expect(text).toMatch(/Q-K-A/);
    expect(text).toMatch(/K-A-2/);
    expect(text).toMatch(/natural/);
    expect(text).toMatch(/GO OUT/);
    expect(text).toMatch(/15/);
    expect(text).toMatch(/face/);
    expect(text).toMatch(/jokers 0/);
    expect(text).toMatch(/2s and Aces are never wild/);
    expect(text).not.toMatch(/2s are not always wild/);
    expect(text).not.toMatch(/Ace wild/);
    expect(HOW_TO_COACH_OFFER).toMatch(/Do that for me/);
    expect(HOW_TO_COACH_OFFER).toMatch(/do not play for you/i);
  });
});
