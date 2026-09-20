export interface HowToPage {
  title: string;
  lines: string[];
}

/** Short, family-friendly rules. Matches locked house calls. */
export const HOW_TO_PAGES: HowToPage[] = [
  {
    title: "Deal 3 through 13",
    lines: [
      "A match is 11 hands. You are dealt 3 cards, then 4, then 5, up to 13.",
      "This hand’s wilds are only the rank equal to the deal: round 1 → 3s, later 4s, then 5s, … Kings. 2s and Aces are never wild.",
      "Jokers stay off unless the host turns them on. They are always wild when they are in.",
    ],
  },
  {
    title: "Sets, runs, and wilds",
    lines: [
      "A set is three or more of one rank. A run is three or more in a row in the same suit.",
      "Aces can be low (A-2-3) or high (Q-K-A). They do not wrap — K-A-2 is not a run.",
      "Keep melds in your hand until someone goes out. Every meld needs at least one natural card — all wilds do not count.",
    ],
  },
  {
    title: "Your turn and going out",
    lines: [
      "Draw one card — stock or the face-up discard — then discard one. A second tap on a selected card deselects it.",
      "Go out by discarding one card so everything left is legal melds. Any such discard goes out on its own. Those cards say GO OUT.",
      "Everyone else then gets one last turn (draw and discard) in the same seating order.",
    ],
  },
  {
    title: "Scoring",
    lines: [
      "Leftover cards are deadwood. Lowest total after 11 hands wins. The player who first went out scores 0 that hand.",
      "Aces score 15 unless the lobby set Aces score 1. 2–10 are face. Jacks, Queens, and Kings are 10.",
      "Caught wilds use printed face by default (jokers 0). The host can switch leftover wilds to 15 and jokers to 20 before Start.",
    ],
  },
];

export const HOW_TO_COACH_OFFER =
  "Want tips on the first 5 hands? They suggest what to draw or when to go out. They do not play for you unless you tap Do that for me.";

export function howtoMentions(pages: HowToPage[] = HOW_TO_PAGES): string {
  return pages.flatMap((page) => [page.title, ...page.lines]).join(" ");
}
