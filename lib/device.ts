// Phone and Desktop filters (#38): which games play on which device, and which device this is.
//
// A game stores how it is controlled (projects.controls), not a device, because the controls decide
// it: a tablet with a keyboard, a laptop with a touchscreen and a phone with a gamepad all exist.
// An empty list means nobody has checked yet.

export const CONTROLS = ["touch", "keyboard", "mouse", "gamepad"] as const;
export type Control = (typeof CONTROLS)[number];

export const CONTROL_LABEL: Record<Control, string> = {
  touch: "Touchscreen",
  keyboard: "Keyboard",
  mouse: "Mouse",
  gamepad: "Gamepad",
};

export type Device = "phone" | "desktop";

export const DEVICE_LABEL: Record<Device, string> = { phone: "Phone", desktop: "Desktop" };

/** Keeps known controls in a fixed order and drops anything else. */
export function normalizeControls(value: readonly string[] | null | undefined): Control[] {
  const set = new Set((value ?? []).map((v) => v.trim().toLowerCase()));
  return CONTROLS.filter((c) => set.has(c));
}

/**
 * Plays on a phone: it supports touch, or it only needs a mouse (a tap acts as a click).
 * A game that needs a keyboard, or one nobody has checked, does not.
 */
export function playsOnPhone(controls: readonly string[] | null | undefined): boolean {
  const c = normalizeControls(controls);
  return c.includes("touch") || (c.includes("mouse") && !c.includes("keyboard"));
}

/**
 * Plays on a computer: anything with a keyboard, mouse or gamepad. Unchecked games count too,
 * because the curated catalogue was picked for keyboard and mouse.
 */
export function playsOnDesktop(controls: readonly string[] | null | undefined): boolean {
  const c = normalizeControls(controls);
  return c.length === 0 || c.some((x) => x !== "touch");
}

/**
 * Worth a "Best on desktop" label on a phone (#47): somebody checked it, and it does not play on a
 * phone. Unchecked games get no label, because we do not know.
 */
export function needsDesktop(controls: readonly string[] | null | undefined): boolean {
  return normalizeControls(controls).length > 0 && !playsOnPhone(controls);
}

export function matchesDevice(controls: readonly string[] | null | undefined, device: Device | null): boolean {
  if (device === "phone") return playsOnPhone(controls);
  if (device === "desktop") return playsOnDesktop(controls);
  return true;
}

/** Supabase's error for a column that does not exist yet (the migration has not run). */
export function isMissingColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST204" || error.code === "42703" || /column .*controls/i.test(error.message ?? "");
}

export function parseDevice(value: string | null | undefined): Device | null {
  return value === "phone" || value === "desktop" ? value : null;
}

/**
 * Is this a phone or tablet? The main pointer being coarse with no hover is the signal: user agents
 * lie (iPads say they are Macs), and a laptop with a touchscreen still has a fine main pointer.
 */
export function isTouchDevice(env: { coarse: boolean; hover: boolean; maxTouchPoints: number }): boolean {
  return env.coarse && !env.hover && env.maxTouchPoints > 0;
}

export function readTouchDevice(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return isTouchDevice({
    coarse: window.matchMedia("(pointer: coarse)").matches,
    hover: window.matchMedia("(hover: hover)").matches,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  });
}

/**
 * A homepage link that keeps the Phone or Desktop choice. "See all" and "Back to home" links are
 * written without it; following one should not quietly show games that don't play on this device.
 * Links to other pages, and links that pick a device themselves, are left alone.
 */
export function keepDevice(href: string, currentSearch: string): string {
  const device = parseDevice(new URLSearchParams(currentSearch).get("device"));
  if (!device) return href;
  const url = new URL(href, "https://x.invalid");
  if (url.origin !== "https://x.invalid" || url.pathname !== "/" || url.searchParams.has("device")) return href;
  url.searchParams.set("device", device);
  return `/${url.search}${url.hash}`;
}
