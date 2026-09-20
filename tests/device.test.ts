import { describe, expect, it } from "vitest";
import { classifyDevice, PHONE_SHORT_MAX } from "../client/lib/device";

describe("device class", () => {
  it("treats a short-side under 600 as a phone", () => {
    expect(PHONE_SHORT_MAX).toBe(600);
    expect(
      classifyDevice({ shortSide: 430, coarse: true, fine: false, hover: false, touchPoints: 5 }),
    ).toBe("phone");
    expect(
      classifyDevice({ shortSide: 390, coarse: true, fine: false, hover: false, touchPoints: 1 }),
    ).toBe("phone");
  });

  it("treats a large touch screen as a tablet, including iPad desktop-site mode", () => {
    expect(
      classifyDevice({ shortSide: 744, coarse: true, fine: false, hover: false, touchPoints: 5 }),
    ).toBe("tablet");
    expect(
      classifyDevice({ shortSide: 834, coarse: false, fine: true, hover: true, touchPoints: 5 }),
    ).toBe("tablet");
  });

  it("treats a hover + fine pointer with no touch as a desktop", () => {
    expect(
      classifyDevice({ shortSide: 800, coarse: false, fine: true, hover: true, touchPoints: 0 }),
    ).toBe("desktop");
    expect(
      classifyDevice({ shortSide: 1080, coarse: false, fine: true, hover: true, touchPoints: 0 }),
    ).toBe("desktop");
  });
});
