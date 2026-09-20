import { formatCard, isWild, wildSpoken } from "./cards.js";
import { chooseDiscard, chooseDraw } from "./bot.js";
import type { Card, Phase, TurnPhase } from "./types.js";

export interface CoachInput {
  phase: Phase;
  round: number;
  dealCount: number;
  wildRank: number;
  yourTurn: boolean;
  turnPhase: TurnPhase | null;
  yourHand: Card[];
  discardTop: Card | null;
  goOutCardIds: string[];
  lastTurnNames: string[];
  acePoints: 1 | 15;
  wildFaceValue: boolean;
  currentPlayerName: string | null;
}

export type CoachAction = "drawStock" | "takeDiscard" | "discard" | "goOut" | "nextRound";

export interface CoachAdvice {
  id: string;
  title: string;
  body: string;
  action?: CoachAction;
  cardId?: string;
  actionLabel?: string;
}

export function coachAdvice(input: CoachInput): CoachAdvice | null {
  const wilds = wildSpoken(input.wildRank);
  const wildCount = input.yourHand.filter((card) => isWild(card, input.wildRank)).length;

  if (input.phase === "round_end") {
    return {
      id: `recap-${input.round}`,
      title: "Scores are up",
      body: "Leftovers count as deadwood. Lowest running total is winning. Caught wilds use face value unless the lobby turned that off.",
      action: "nextRound",
      actionLabel: "Do that for me — next hand",
    };
  }

  if (input.phase !== "playing") return null;

  if (input.lastTurnNames.length > 0 && !input.yourTurn) {
    return {
      id: `last-wait-${input.round}`,
      title: "Last licks",
      body: `${input.lastTurnNames[0] ?? "Someone"} went out. You still get one last draw and discard to cut leftover points.`,
    };
  }

  if (!input.yourTurn) {
    return {
      id: `wait-${input.round}-${input.currentPlayerName ?? "table"}`,
      title: "Wait your turn",
      body: `This hand deals ${input.dealCount} — ${wilds} are wild. Build sets of 3+ or same-suit runs. Melds stay in your hand.`,
    };
  }

  if (input.turnPhase === "draw") {
    const pick = chooseDraw(
      input.yourHand,
      input.discardTop,
      input.wildRank,
      input.acePoints,
      input.wildFaceValue,
    );
    if (pick === "discard" && input.discardTop) {
      return {
        id: `draw-up-${input.round}-${input.discardTop.id}`,
        title: "Take the upcard?",
        body: `${formatCard(input.discardTop)} looks useful — it helps a set or run, or it is wild. Take it if you can use it.`,
        action: "takeDiscard",
        actionLabel: "Do that for me — take upcard",
      };
    }
    return {
      id: `draw-stock-${input.round}`,
      title: "Draw from the stock",
      body: input.discardTop
        ? `The upcard (${formatCard(input.discardTop)}) does not help enough. Draw from the stock, then throw a leftover.`
        : "Draw from the stock, then discard one leftover card.",
      action: "drawStock",
      actionLabel: "Do that for me — draw stock",
    };
  }

  if (input.turnPhase === "discard") {
    if (input.lastTurnNames.length > 0) {
      const choice = chooseDiscard(input.yourHand, input.wildRank, input.acePoints, input.wildFaceValue);
      if (choice.goOut) {
        return {
          id: `last-out-${input.round}-${choice.cardId}`,
          title: "You can go out",
          body: "A GO OUT card leaves the rest of your hand as legal melds. Throw it and you score 0 this hand.",
          action: "goOut",
          cardId: choice.cardId,
          actionLabel: "Do that for me — go out",
        };
      }
      return {
        id: `last-dump-${input.round}-${choice.cardId}`,
        title: "Last discard",
        body:
          wildCount > 0
            ? `Dump a natural leftover. Keep ${wilds} (and jokers) unless they are all you have. Each meld still needs a natural card.`
            : "Dump your highest leftover that is not part of a set or run.",
        action: "discard",
        cardId: choice.cardId,
        actionLabel: "Do that for me — discard",
      };
    }

    const goOutIds = input.goOutCardIds;
    if (goOutIds.length > 0) {
      const choice = chooseDiscard(input.yourHand, input.wildRank, input.acePoints, input.wildFaceValue);
      const cardId = goOutIds.includes(choice.cardId) ? choice.cardId : goOutIds[0];
      return {
        id: `go-out-${input.round}-${cardId}`,
        title: "You can go out",
        body: "Cards marked GO OUT leave the rest of your hand as sets and runs. Any of those discards goes out automatically.",
        action: "goOut",
        cardId,
        actionLabel: "Do that for me — go out",
      };
    }

    const choice = chooseDiscard(input.yourHand, input.wildRank, input.acePoints, input.wildFaceValue);
    return {
      id: `dump-${input.round}-${choice.cardId}`,
      title: "Throw a leftover",
      body:
        wildCount > 0
          ? `Tap a natural that is not in a meld, then Discard. Keep ${wilds} to fill a set or run — you still need at least one natural in each meld.`
          : "Tap a leftover that is not in a set or run, then Discard. A second tap deselects.",
      action: "discard",
      cardId: choice.cardId,
      actionLabel: "Do that for me — discard",
    };
  }

  return null;
}
