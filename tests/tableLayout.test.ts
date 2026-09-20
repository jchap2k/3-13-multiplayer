import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../client/index.css", import.meta.url), "utf8");
const table = readFileSync(new URL("../client/components/Table.tsx", import.meta.url), "utf8");

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
    expect(piles).toMatch(/min-width:\s*min\(100%, 9\.5rem\)/);
  });

  it("does not let the desktop play grid collapse the felt to zero", () => {
    const desktop = ruleBlock('html[data-device="desktop"] .play-split');
    expect(desktop).toMatch(/grid-template-rows:\s*minmax\(13\.5rem, 1fr\)/);
    expect(desktop).not.toMatch(/grid-template-rows:\s*minmax\(0,\s*1fr\)/);

    const tablet = ruleBlock('html[data-device="tablet"] .play-split');
    expect(tablet).toMatch(/minmax\(12\.75rem, min\(16rem, 34dvh\)\)/);
    expect(tablet).toMatch(/minmax\(12rem, 1fr\)/);
    expect(tablet).toMatch(/min-height:\s*26rem/);
    expect(tablet).toMatch(/"table scores"/);

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
    expect(piles).toMatch(/min-height:\s*7\.5rem/);
    expect(piles).toMatch(/min-width:\s*min\(100%, 9\.5rem\)/);
    expect(piles).toMatch(/flex:\s*0 0 auto/);
  });

  it("keeps the phone column scrollable and unclipped", () => {
    const phoneTable = ruleBlock('html[data-device="phone"] .pane-table {');
    expect(phoneTable).toMatch(/overflow:\s*visible/);
    expect(phoneTable).toMatch(/min-height:\s*0/);

    const phonePiles = ruleBlock('html[data-device="phone"] .pane-table .pile-row,');
    expect(phonePiles).toMatch(/flex-wrap:\s*wrap/);
  });
});
