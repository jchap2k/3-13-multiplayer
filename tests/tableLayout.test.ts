import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DISCARD_HINT } from "../client/lib/handSelect";

const css = readFileSync(new URL("../client/index.css", import.meta.url), "utf8");
const table = readFileSync(new URL("../client/components/Table.tsx", import.meta.url), "utf8");
const hand = readFileSync(new URL("../client/components/Hand.tsx", import.meta.url), "utf8");
const scoreboard = readFileSync(new URL("../client/components/Scoreboard.tsx", import.meta.url), "utf8");
const lobby = readFileSync(new URL("../client/components/Lobby.tsx", import.meta.url), "utf8");
const turnStrip = readFileSync(new URL("../client/components/TurnStrip.tsx", import.meta.url), "utf8");

function ruleBlock(selector: string): string {
  const start = css.indexOf(selector);
  expect(start, `missing selector ${selector}`).toBeGreaterThan(-1);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open, close + 1);
}

describe("mid-hand table piles stay reserved on tablet/desktop", () => {
  it("keeps the turn strip outside the letterboxed felt", () => {
    const stripAt = table.indexOf("table-turn-strip");
    const feltAt = table.indexOf("felt-table table-surface");
    const pilesAt = table.indexOf("felt-piles");
    expect(stripAt).toBeGreaterThan(-1);
    expect(feltAt).toBeGreaterThan(stripAt);
    expect(pilesAt).toBeGreaterThan(feltAt);
    expect(table.indexOf("TurnStrip", feltAt)).toBe(-1);
  });

  it("stacks the felt inner column and reserves the pile row", () => {
    const inner = ruleBlock('html[data-device="tablet"] .table-surface-inner,');
    expect(inner).toMatch(/flex-direction:\s*column/);
    expect(inner).toMatch(/min-height:\s*8\.75rem/);

    const piles = ruleBlock('html[data-device="tablet"] .pane-table .pile-row,');
    expect(piles).toMatch(/flex:\s*0 0 auto/);
    expect(piles).toMatch(/flex-wrap:\s*nowrap/);
    expect(piles).toMatch(/min-width:\s*min\(100%, 18rem\)/);
  });

  it("does not let the desktop play grid collapse the felt to zero", () => {
    const desktop = ruleBlock('html[data-device="desktop"] .play-split');
    expect(desktop).toMatch(/grid-template-rows:\s*minmax\(16rem, 1fr\)/);
    expect(desktop).not.toMatch(/grid-template-rows:\s*minmax\(0,\s*1fr\)/);
    expect(desktop).toMatch(/"table hand"/);

    const tablet = ruleBlock('html[data-device="tablet"] .play-split');
    expect(tablet).toMatch(/minmax\(16rem, 1fr\)/);
    expect(tablet).toMatch(/"table hand"/);
    expect(tablet).toMatch(/"scores scores"/);

    const cards = ruleBlock('html[data-device="tablet"] .hand-cards,');
    expect(cards).toMatch(/min-height:\s*7\.25rem/);
  });

  it("lets a tall chrome column scroll instead of clipping piles away", () => {
    const frame = ruleBlock('html[data-device="tablet"] .table-frame,');
    expect(frame).toMatch(/overflow-y:\s*auto/);
    expect(frame).not.toMatch(/overflow:\s*hidden/);

    const chrome = ruleBlock('html[data-device="tablet"] .table-chrome,');
    expect(chrome).toMatch(/max-height:\s*min\(32dvh, 18rem\)/);
    expect(chrome).toMatch(/overflow:\s*auto/);
  });

  it("gives felt piles a reserved box that cannot collapse", () => {
    const piles = ruleBlock(".felt-piles");
    expect(piles).toMatch(/min-height:\s*13rem/);
    expect(piles).toMatch(/min-width:\s*min\(100%, 18rem\)/);
    expect(piles).toMatch(/flex:\s*0 0 auto/);
  });

  it("keeps the phone column from clipping the felt", () => {
    const phoneTable = ruleBlock('html[data-device="phone"] .pane-table {');
    expect(phoneTable).toMatch(/overflow:\s*visible/);
    expect(phoneTable).toMatch(/min-height:\s*0/);
  });
});

describe("approved wireframe layout", () => {
  it("pins one discard instruction on a bar outside the hand", () => {
    expect(DISCARD_HINT).toBe("Tap a card to select it, then press Discard.");
    const barAt = table.indexOf("<DiscardBar");
    const handAt = table.indexOf("<Hand");
    expect(barAt).toBeGreaterThan(handAt);
    expect(table).not.toContain("Discard appears above it");
    expect(table).not.toContain("Discard sits on the selected card");
    expect(hand).not.toContain("Discard appears above it");
    expect(css).toContain(".discard-bar");
  });

  it("stacks portrait and narrow viewports instead of the side-by-side grid", () => {
    const portrait = css.indexOf("@media (orientation: portrait), (max-width: 768px)");
    expect(portrait).toBeGreaterThan(-1);
    const block = css.slice(portrait, portrait + 900);
    expect(block).toMatch(/flex-direction:\s*column/);
    expect(block).toContain('"felt seats"');
    const narrow = css.indexOf("@media (max-width: 480px)");
    expect(narrow).toBeGreaterThan(portrait);
    const narrowBlock = css.slice(narrow, narrow + 500);
    expect(narrowBlock).toContain('html[data-device="tablet"] .pane-table');
    expect(narrowBlock).toMatch(/minmax\(8\.25rem,\s*0\.85fr\)/);
  });

  it("splits the next-round dock from the countdown and freezes late score columns", () => {
    expect(scoreboard).toContain("data-next-round-dock");
    expect(scoreboard).toContain("Deal now");
    expect(scoreboard).not.toContain("Next round ·");
    expect(scoreboard).toContain("round-table-compact");
    expect(css).toContain(".next-round-dock");
    expect(css).toMatch(/\.round-table-compact \.col-player/);
    expect(css).toMatch(/\.round-table-compact \.col-total/);
  });

  it("spans the live score strip across the play grid and wraps seat names", () => {
    const scores = ruleBlock('html[data-device="desktop"] .live-scores-playing');
    expect(scores).toMatch(/grid-column:\s*1 \/ -1/);
    expect(scores).not.toMatch(/grid-column:\s*auto/);
    expect(css).toContain(".turn-seat-name");
    expect(turnStrip).toContain("turn-seat-heading");
    const nameBlock = turnStrip.slice(turnStrip.indexOf("turn-seat-name"), turnStrip.indexOf("turn-seat-meta"));
    expect(nameBlock).not.toContain("· bot");
  });

  it("keeps a single gold copy link and a sticky lobby dock", () => {
    expect(lobby.match(/Copy link/g)?.length).toBe(1);
    expect(lobby).toContain("Copy code");
    expect(lobby).toContain("lobby-dock");
    expect(lobby).toContain("House rules");
    expect(css).toContain(".lobby-dock");
  });
});
