import { useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@shared/types";
import { LONG_PRESS_MS, resolveCardRelease } from "../lib/a11y";
import { useA11y } from "../lib/A11yContext";
import {
  arrayMove,
  groupWilds,
  loadHandOrder,
  mergeHandOrder,
  orderedHand,
  saveHandOrder,
  sortByMelds,
  sortByRank,
  sortBySuit,
} from "../lib/handOrder";
import { PlayingCard } from "./PlayingCard";
import { Button } from "./ui/button";

type DragSession = {
  id: string;
  x: number;
  y: number;
  moved: boolean;
};

export function Hand({
  hand,
  wildRank,
  storageKey,
  selected,
  onSelect,
  onConfirm,
  onGestureDiscard,
  selectable,
  goOutIds = [],
  largePips = false,
  acePoints = 15,
  wildFaceValue = false,
}: {
  hand: Card[];
  wildRank: number;
  storageKey: string;
  selected: string | null;
  onSelect: (cardId: string | null) => void;
  onConfirm?: (cardId: string) => void;
  onGestureDiscard?: (cardId: string) => void;
  selectable: boolean;
  goOutIds?: string[];
  largePips?: boolean;
  acePoints?: 1 | 15;
  wildFaceValue?: boolean;
}) {
  const { prefs } = useA11y();
  const [order, setOrder] = useState<string[]>(() =>
    mergeHandOrder(loadHandOrder(storageKey), hand),
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const overRef = useRef<string | null>(null);
  const idsRef = useRef<string[]>([]);
  const lastTapRef = useRef<{ id: string; at: number } | null>(null);
  const longTimerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const handSig = hand
    .map((card) => card.id)
    .slice()
    .sort()
    .join(",");

  useEffect(() => {
    setOrder((prev) => {
      const base = prev.length ? prev : loadHandOrder(storageKey);
      const next = mergeHandOrder(base, hand);
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev;
      return next;
    });
  }, [hand, handSig, storageKey]);

  useEffect(() => {
    saveHandOrder(storageKey, order);
  }, [order, storageKey]);

  const cards = useMemo(() => orderedHand(hand, order), [hand, order]);
  const ids = cards.map((card) => card.id);
  idsRef.current = ids;
  const dragCard = cards.find((card) => card.id === dragId) ?? null;

  function applyOrder(next: string[]) {
    setOrder(mergeHandOrder(next, hand));
  }

  function nearestCard(x: number, y: number, ignoreId?: string): string | null {
    const nodes = document.querySelectorAll("[data-hand-card]");
    let best: string | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const id = node.dataset.handCard;
      if (!id || id === ignoreId) return;
      const rect = node.getBoundingClientRect();
      const pad = 28;
      const inside =
        x >= rect.left - pad &&
        x <= rect.right + pad &&
        y >= rect.top - pad &&
        y <= rect.bottom + pad;
      if (!inside) return;
      const dist = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
      if (dist < bestDist) {
        bestDist = dist;
        best = id;
      }
    });
    return best;
  }

  function clearLongTimer() {
    if (longTimerRef.current != null) {
      window.clearTimeout(longTimerRef.current);
      longTimerRef.current = null;
    }
  }

  function fireGesture(cardId: string) {
    clearLongTimer();
    lastTapRef.current = null;
    longFiredRef.current = true;
    sessionRef.current = null;
    setDragId(null);
    setOverId(null);
    setGhost(null);
    (onGestureDiscard ?? onConfirm)?.(cardId);
  }

  function begin(id: string, x: number, y: number) {
    if (sessionRef.current) return;
    sessionRef.current = { id, x, y, moved: false };
    longFiredRef.current = false;
    if (prefs.longDiscard && selectable) {
      clearLongTimer();
      longTimerRef.current = window.setTimeout(() => {
        const session = sessionRef.current;
        if (!session || session.moved || session.id !== id) return;
        fireGesture(id);
      }, LONG_PRESS_MS);
    }
  }

  function move(x: number, y: number) {
    const session = sessionRef.current;
    if (!session) return;
    if (!session.moved && Math.hypot(x - session.x, y - session.y) >= 8) {
      session.moved = true;
      clearLongTimer();
      setDragId(session.id);
    }
    if (session.moved) {
      setGhost({ x, y });
      const over = nearestCard(x, y, session.id);
      overRef.current = over;
      setOverId(over);
    }
  }

  function end() {
    const session = sessionRef.current;
    sessionRef.current = null;
    const over = overRef.current;
    overRef.current = null;
    clearLongTimer();
    if (longFiredRef.current) {
      longFiredRef.current = false;
      setDragId(null);
      setOverId(null);
      setGhost(null);
      return;
    }
    if (session?.moved && over && over !== session.id) {
      const from = idsRef.current.indexOf(session.id);
      const to = idsRef.current.indexOf(over);
      if (from >= 0 && to >= 0) applyOrder(arrayMove(idsRef.current, from, to));
    } else if (session && !session.moved) {
      const last = lastTapRef.current;
      const action = resolveCardRelease({
        moved: false,
        selectable,
        alreadySelected: selectedRef.current === session.id,
        doubleDiscard: prefs.doubleDiscard,
        sameAsLastTap: last?.id === session.id,
        msSinceLastTap: last ? Date.now() - last.at : null,
        longPressFired: false,
      });
      if (action === "gestureDiscard") {
        fireGesture(session.id);
      } else if (action === "deselect") {
        lastTapRef.current = { id: session.id, at: Date.now() };
        onSelect(null);
      } else if (action === "select") {
        lastTapRef.current = { id: session.id, at: Date.now() };
        onSelect(session.id);
      }
    }
    setDragId(null);
    setOverId(null);
    setGhost(null);
  }

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      if (!sessionRef.current) return;
      event.preventDefault();
      move(event.clientX, event.clientY);
    }
    function onMouseMove(event: MouseEvent) {
      if (!sessionRef.current) return;
      move(event.clientX, event.clientY);
    }
    function onUp() {
      if (!sessionRef.current) return;
      end();
    }
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  });

  return (
    <div className="hand-root">
      <div className="hand-sort-bar" role="toolbar" aria-label="Sort hand">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 bg-black/25 px-2.5"
          onClick={() => applyOrder(sortByMelds(cards, wildRank, acePoints, wildFaceValue))}
        >
          Melds
        </Button>
        <Button size="sm" variant="ghost" className="h-8 bg-black/25 px-2.5" onClick={() => applyOrder(sortByRank(cards))}>
          Rank
        </Button>
        <Button size="sm" variant="ghost" className="h-8 bg-black/25 px-2.5" onClick={() => applyOrder(sortBySuit(cards))}>
          Suit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 bg-black/25 px-2.5"
          onClick={() => applyOrder(groupWilds(cards, wildRank))}
        >
          Wilds first
        </Button>
      </div>
      <p className="hand-hint mb-2 text-xs text-emerald-100/70">
        {selectable
          ? [
              "Tap a card to select — Discard appears above it. Tap again to deselect.",
              prefs.doubleDiscard ? "Double-tap discards, and goes out if that discard is legal." : null,
              prefs.longDiscard ? `Hold ${LONG_PRESS_MS}ms to discard the same way.` : null,
            ]
              .filter(Boolean)
              .join(" ")
          : "Drag cards to rearrange"}
      </p>
      <div className="hand-cards flex flex-wrap items-end gap-2 pt-8">
        {cards.map((card) => {
          const isSelected = selected === card.id;
          const showDiscard = Boolean(selectable && isSelected && onConfirm);
          return (
          <div
            key={card.id}
            data-hand-card={card.id}
            className="hand-card-enter relative touch-none"
            onContextMenu={(event) => event.preventDefault()}
            onPointerDown={(event) => {
              if (event.button !== undefined && event.button !== 0) return;
              event.preventDefault();
              begin(card.id, event.clientX, event.clientY);
            }}
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              begin(card.id, event.clientX, event.clientY);
            }}
          >
            {showDiscard ? (
              <button
                type="button"
                className="absolute -top-7 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-200/70 bg-amber-400 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-stone-950 shadow-md"
                aria-label="Discard selected card"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onConfirm?.(card.id);
                }}
              >
                Discard
              </button>
            ) : null}
            <PlayingCard
              card={card}
              wildRank={wildRank}
              selected={isSelected}
              goOut={goOutIds.includes(card.id)}
              largePips={largePips}
              size="hand"
              dragging={dragId === card.id}
              dropTarget={overId === card.id}
              grab
            />
          </div>
          );
        })}
      </div>
      {dragCard && ghost ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2"
          style={{ left: ghost.x, top: ghost.y }}
        >
          <PlayingCard card={dragCard} wildRank={wildRank} size="hand" selected largePips={largePips} />
        </div>
      ) : null}
    </div>
  );
}
