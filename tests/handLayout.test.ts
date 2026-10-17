import { describe, expect, it } from "vitest";
import { handRowColumns } from "../client/lib/handLayout";

describe("hand rows", () => {
  it("keeps one row through 7 cards and splits later hands into two even rows", () => {
    expect(handRowColumns(0)).toBe(1);
    expect(handRowColumns(4)).toBe(4);
    expect(handRowColumns(7)).toBe(7);
    expect(handRowColumns(8)).toBe(4);
    expect(handRowColumns(13)).toBe(7);
    expect(handRowColumns(14)).toBe(7);
  });
});
