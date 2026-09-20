export type DeviceKind = "phone" | "tablet" | "desktop";
export type DeviceOrientation = "portrait" | "landscape";

/** Short side below this (CSS px, `screen`) is a phone. iPhone 15 Pro Max ≈ 430. */
export const PHONE_SHORT_MAX = 600;

/**
 * Viewport width at which a classified tablet (touch PC, large iPad) uses the
 * desktop felt | hand split so stock/discard stay in a reserved left TABLE.
 * Keep the CSS `@media (min-width: 1280px)` in index.css in sync.
 */
export const WIDE_TABLET_DESKTOP_MIN = 1280;

export function classifyDevice(input: {
  shortSide: number;
  coarse: boolean;
  fine: boolean;
  hover: boolean;
  touchPoints: number;
}): DeviceKind {
  if (input.shortSide < PHONE_SHORT_MAX) return "phone";
  const touch = input.touchPoints > 0 || input.coarse;
  if (touch) return "tablet";
  if (input.hover && input.fine) return "desktop";
  return "tablet";
}

export function readDevice(): { device: DeviceKind; orientation: DeviceOrientation } {
  if (typeof window === "undefined") {
    return { device: "desktop", orientation: "landscape" };
  }
  const shortSide = Math.min(window.screen.width, window.screen.height);
  const device = classifyDevice({
    shortSide,
    coarse: window.matchMedia("(pointer: coarse)").matches,
    fine: window.matchMedia("(pointer: fine)").matches,
    hover: window.matchMedia("(hover: hover)").matches,
    touchPoints: navigator.maxTouchPoints ?? 0,
  });
  const orientation: DeviceOrientation = window.matchMedia("(orientation: landscape)").matches
    ? "landscape"
    : "portrait";
  return { device, orientation };
}

export function applyDeviceDataset(target: HTMLElement = document.documentElement) {
  const { device, orientation } = readDevice();
  target.dataset.device = device;
  target.dataset.orientation = orientation;
}

/** Sets `data-device` and `data-orientation` on `<html>` and keeps them current.
 *  index.html also boots these attributes inline so Fly's first paint is correct. */
export function startDeviceWatch() {
  applyDeviceDataset();
  const refresh = () => applyDeviceDataset();
  window.addEventListener("resize", refresh);
  window.addEventListener("orientationchange", refresh);
  for (const query of ["(orientation: landscape)", "(pointer: coarse)", "(hover: hover)"]) {
    window.matchMedia(query).addEventListener("change", refresh);
  }
}
