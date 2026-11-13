// Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

// A minimal browser: window events and the Fullscreen API.
let exited = 0;
globalThis.window = new EventTarget();
globalThis.document = { fullscreenElement: null, exitFullscreen: async () => void exited++ };

const { leaveFullscreen, onLeaveFullscreen } = await import("./fullscreen.ts");

test("leaveFullscreen tells the stage to drop the CSS fallback", () => {
  let heard = 0;
  const off = onLeaveFullscreen(() => heard++);
  leaveFullscreen();
  assert.equal(heard, 1);
  off();
  leaveFullscreen();
  assert.equal(heard, 1);
});

test("leaveFullscreen exits real fullscreen only when something is fullscreen", () => {
  exited = 0;
  document.fullscreenElement = null;
  leaveFullscreen();
  assert.equal(exited, 0);
  document.fullscreenElement = {};
  leaveFullscreen();
  assert.equal(exited, 1);
  document.fullscreenElement = null;
});

test("a refused exitFullscreen does not throw", async () => {
  document.fullscreenElement = {};
  document.exitFullscreen = () => Promise.reject(new Error("not allowed"));
  assert.doesNotThrow(() => leaveFullscreen());
  await new Promise((r) => setTimeout(r, 0));
  document.fullscreenElement = null;
});
