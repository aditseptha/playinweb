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

test("a game plays on a phone only once an admin has passed it on a real phone", () => {
  assert.equal(playsOnPhone({ mobileReady: true }), true);
  assert.equal(playsOnPhone({ mobileReady: true, controls: ["keyboard"] }), true, "the phone test wins over the controls");
  assert.equal(playsOnPhone({ mobileReady: false, controls: ["touch"] }), false, "touch alone is not enough");
  assert.equal(playsOnPhone({ controls: ["mouse"] }), false);
  assert.equal(playsOnPhone({}), false, "untested games stay off Phone");
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
  assert.equal(matchesDevice({ controls: ["touch"] }, "phone"), false);
  assert.equal(matchesDevice({ controls: ["touch"], mobileReady: true }, "phone"), true);
  assert.equal(matchesDevice({ controls: ["keyboard"] }, "desktop"), true);
  assert.equal(matchesDevice({ controls: ["touch"], mobileReady: true }, "desktop"), false);
  assert.equal(matchesDevice({ controls: ["touch"] }, null), true);
  assert.equal(matchesDevice({}, "desktop"), true);
});

test("parseOrientation reads a stored orientation", async () => {
  const { parseOrientation } = await import("./device.ts");
  assert.equal(parseOrientation("portrait"), "portrait");
  assert.equal(parseOrientation("landscape"), "landscape");
  assert.equal(parseOrientation("any"), "any");
  assert.equal(parseOrientation("sideways"), undefined);
  assert.equal(parseOrientation(null), undefined);
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
  assert.equal(isMissingColumnError({ message: "column projects.mobile_ready does not exist" }), true);
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

test("Best on desktop goes on checked games that need a keyboard and have not passed on a phone", async () => {
  const { needsDesktop } = await import("./device.ts");
  assert.equal(needsDesktop({ controls: ["keyboard"] }), true);
  assert.equal(needsDesktop({ controls: ["keyboard", "mouse"] }), true);
  assert.equal(needsDesktop({ controls: ["gamepad"] }), true);
  assert.equal(needsDesktop({ controls: ["touch", "keyboard"] }), false);
  assert.equal(needsDesktop({ controls: ["mouse"] }), false);
  // Passed on a phone: never labelled, whatever the controls say.
  assert.equal(needsDesktop({ controls: ["keyboard"], mobileReady: true }), false);
  // Nobody checked: no label.
  assert.equal(needsDesktop({ controls: [] }), false);
  assert.equal(needsDesktop({}), false);
});
