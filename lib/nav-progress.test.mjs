import assert from "node:assert/strict";
import { test } from "node:test";
import { finishNavigation, startNavigation, startsNavigation, subscribeNavigation } from "./nav-progress.ts";

const HERE = "https://playinweb.com/?view=new";
const click = (over = {}) => ({
  href: "https://playinweb.com/playinwebcurator/ayam",
  target: null,
  download: false,
  button: 0,
  modified: false,
  defaultPrevented: false,
  ...over,
});

test("a plain click on a link to another page starts the bar", () => {
  assert.equal(startsNavigation(click(), HERE), true);
  assert.equal(startsNavigation(click({ href: "/devlog" }), HERE), true);
  assert.equal(startsNavigation(click({ href: "https://playinweb.com/?view=popular" }), HERE), true);
});

test("the browser's own navigations do not start it", () => {
  assert.equal(startsNavigation(click({ modified: true }), HERE), false);
  assert.equal(startsNavigation(click({ button: 1 }), HERE), false);
  assert.equal(startsNavigation(click({ target: "_blank" }), HERE), false);
  assert.equal(startsNavigation(click({ download: true }), HERE), false);
  assert.equal(startsNavigation(click({ href: "https://itch.io/game" }), HERE), false);
  assert.equal(startsNavigation(click({ href: "mailto:hi@example.com" }), HERE), false);
  assert.equal(startsNavigation(click({ href: null }), HERE), false);
});

test("links that stay on the page, or that code already handled, do not start it", () => {
  assert.equal(startsNavigation(click({ href: HERE }), HERE), false);
  assert.equal(startsNavigation(click({ href: "https://playinweb.com/?view=new#top" }), HERE), false);
  assert.equal(startsNavigation(click({ defaultPrevented: true }), HERE), false);
});

test("subscribers hear start and finish once each", () => {
  const heard = [];
  const off = subscribeNavigation((r) => heard.push(r));
  startNavigation();
  startNavigation();
  finishNavigation();
  finishNavigation();
  off();
  startNavigation();
  finishNavigation();
  assert.deepEqual(heard, [true, false]);
});
