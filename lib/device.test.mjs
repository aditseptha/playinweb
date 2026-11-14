// Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

const { isMissingColumnError, isTouchDevice, matchesDevice, normalizeControls, parseDevice, playsOnDesktop, playsOnPhone } =
  await import("./device.ts");

test("normalizeControls keeps known controls in a fixed order", () => {
  assert.deepEqual(normalizeControls(["Mouse", "touch", "joystick", "mouse"]), ["touch", "mouse"]);
  assert.deepEqual(normalizeControls(null), []);
  assert.deepEqual(normalizeControls(undefined), []);
});

test("a game plays on a phone with touch, or with a mouse and no keyboard", () => {
  assert.equal(playsOnPhone(["touch"]), true);
  assert.equal(playsOnPhone(["touch", "keyboard", "mouse"]), true);
  assert.equal(playsOnPhone(["mouse"]), true);
  assert.equal(playsOnPhone(["mouse", "gamepad"]), true);
  assert.equal(playsOnPhone(["keyboard", "mouse"]), false);
  assert.equal(playsOnPhone(["keyboard"]), false);
  assert.equal(playsOnPhone(["gamepad"]), false);
  assert.equal(playsOnPhone([]), false, "unchecked games stay off the Phone chip");
});

test("a game plays on a computer unless it only supports touch", () => {
  assert.equal(playsOnDesktop(["keyboard"]), true);
  assert.equal(playsOnDesktop(["mouse"]), true);
  assert.equal(playsOnDesktop(["gamepad"]), true);
  assert.equal(playsOnDesktop(["touch", "mouse"]), true);
  assert.equal(playsOnDesktop([]), true, "unchecked games count as desktop");
  assert.equal(playsOnDesktop(["touch"]), false);
});

test("matchesDevice applies the chip, or lets everything through without one", () => {
  assert.equal(matchesDevice(["keyboard"], "phone"), false);
  assert.equal(matchesDevice(["keyboard"], "desktop"), true);
  assert.equal(matchesDevice(["touch"], "desktop"), false);
  assert.equal(matchesDevice(["touch"], null), true);
  assert.equal(matchesDevice(undefined, "desktop"), true);
});

test("parseDevice reads the ?device= parameter", () => {
  assert.equal(parseDevice("phone"), "phone");
  assert.equal(parseDevice("desktop"), "desktop");
  assert.equal(parseDevice("tablet"), null);
  assert.equal(parseDevice(null), null);
});

test("isTouchDevice: phones and tablets yes, computers no (even with a touchscreen)", () => {
  assert.equal(isTouchDevice({ coarse: true, hover: false, maxTouchPoints: 5 }), true, "phone");
  assert.equal(isTouchDevice({ coarse: true, hover: false, maxTouchPoints: 5 }), true, "iPad, which claims to be a Mac");
  assert.equal(isTouchDevice({ coarse: false, hover: true, maxTouchPoints: 10 }), false, "laptop with a touchscreen");
  assert.equal(isTouchDevice({ coarse: false, hover: true, maxTouchPoints: 0 }), false, "desktop");
  assert.equal(isTouchDevice({ coarse: true, hover: false, maxTouchPoints: 0 }), false, "no touch points at all");
});

test("isMissingColumnError spots a column that does not exist yet", () => {
  assert.equal(isMissingColumnError({ code: "PGRST204", message: "Could not find the 'controls' column" }), true);
  assert.equal(isMissingColumnError({ code: "42703", message: "column projects.controls does not exist" }), true);
  assert.equal(isMissingColumnError({ code: "23514", message: "violates check constraint" }), false);
  assert.equal(isMissingColumnError(null), false);
});

test("homepage links keep the device choice", async () => {
  const { keepDevice } = await import("./device.ts");
  assert.equal(keepDevice("/?view=new&browse=1", "?device=phone"), "/?view=new&browse=1&device=phone");
  assert.equal(keepDevice("/", "?view=hot&device=desktop"), "/?device=desktop");
  // Nothing to keep, a link that picks its own device, or another page: unchanged.
  assert.equal(keepDevice("/?view=new", ""), "/?view=new");
  assert.equal(keepDevice("/?device=desktop", "?device=phone"), "/?device=desktop");
  assert.equal(keepDevice("/devlog", "?device=phone"), "/devlog");
  assert.equal(keepDevice("https://itch.io/?a=1", "?device=phone"), "https://itch.io/?a=1");
});
