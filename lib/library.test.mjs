// Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

const { isAccountGameId, libraryChanges, libraryOnSignIn } = await import("./library.ts");

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

test("only games saved in the database can go on the account", () => {
  assert.equal(isAccountGameId(A), true);
  assert.equal(isAccountGameId("local-tap"), false);
  assert.equal(isAccountGameId(""), false);
});

test("the first sign-in on a device keeps what was saved as a guest", () => {
  const { library, upload } = libraryOnSignIn({ local: [B, "local-tap"], remote: [A], firstOnDevice: true });
  assert.deepEqual(library, [A, B, "local-tap"]);
  assert.deepEqual(upload, [B], "the guest's game goes up; the browser-only one stays here");
});

test("the first sign-in uploads nothing the account already has", () => {
  const { library, upload } = libraryOnSignIn({ local: [A, A], remote: [A], firstOnDevice: true });
  assert.deepEqual(library, [A]);
  assert.deepEqual(upload, []);
});

test("after the first sync the account wins, so a game removed elsewhere stays removed", () => {
  // B was removed on the computer; this phone still has it in its old copy.
  const { library, upload } = libraryOnSignIn({ local: [A, B, "local-tap"], remote: [A, C], firstOnDevice: false });
  assert.deepEqual(library, [A, C, "local-tap"]);
  assert.deepEqual(upload, []);
});

test("libraryChanges lists what to add and remove on the account", () => {
  assert.deepEqual(libraryChanges([A, B], [B, C]), { added: [C], removed: [A] });
  assert.deepEqual(libraryChanges([A], [A]), { added: [], removed: [] });
  // Browser-only games never reach the account.
  assert.deepEqual(libraryChanges([], ["local-tap"]), { added: [], removed: [] });
});
