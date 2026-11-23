// Phone and Desktop filters (#38): which games play on which device, and which device this is.
//
// Phone means an admin played the game on a real phone and it passed (projects.mobile_ready): full
// touch controls, fits the screen, loads fine on 4G. Touch in the controls list is not enough; plenty
// of games that list it still need a keyboard or leave half the screen black.
//
// Desktop still reads how the game is controlled (projects.controls). An empty list means nobody has
// checked yet.

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

export const ORIENTATIONS = ["portrait", "landscape", "any"] as const;
export type Orientation = (typeof ORIENTATIONS)[number];

export const ORIENTATION_LABEL: Record<Orientation, string> = {
  portrait: "Portrait",
  landscape: "Landscape",
  any: "Either way",
};

/** A stored orientation, or undefined for anything else (unset included). */
export function parseOrientation(value: string | null | undefined): Orientation | undefined {
  return ORIENTATIONS.find((o) => o === value);
}

/** What the device filters read from a game. */
export type DeviceFacts = { controls?: readonly string[] | null; mobileReady?: boolean | null };

/** Plays on a phone: an admin tested it on a real phone and it passed. */
export function playsOnPhone(game: DeviceFacts): boolean {
  return game.mobileReady === true;
}

/** The controls alone suggest a phone could work: touch, or a mouse and no keyboard (a tap is a click). */
function touchFriendly(controls: readonly string[] | null | undefined): boolean {
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
 * Worth a "Best on desktop" label on a phone (#47): somebody checked its controls, they need a keyboard
 * or gamepad, and nobody has passed it on a phone. Unchecked games get no label, because we do not know.
 */
export function needsDesktop(game: DeviceFacts): boolean {
  if (playsOnPhone(game)) return false;
  return normalizeControls(game.controls).length > 0 && !touchFriendly(game.controls);
}

export function matchesDevice(game: DeviceFacts, device: Device | null): boolean {
  if (device === "phone") return playsOnPhone(game);
  if (device === "desktop") return playsOnDesktop(game.controls);
  return true;
}

/** Supabase's error for a column that does not exist yet (its migration has not run). */
export function isMissingColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /column .*(controls|mobile_ready|orientation)/i.test(error.message ?? "")
  );
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
