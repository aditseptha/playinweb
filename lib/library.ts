// The Library on the account (#38): how the browser's copy and the account's copy meet.
//
// The browser keeps a Library for guests (localStorage, lib/store.tsx). A signed-in player's Library
// lives on the account (public.library_items), so a game saved on a phone is there on the computer.
//
// - The first time a player signs in on a device, the two copies merge: nothing saved as a guest
//   is lost.
// - After that the account wins on that device. A game removed on the computer stays removed on the
//   phone instead of coming back from the phone's old copy.
// - Games that only exist in this browser (made in the local demo catalogue) never reach the
//   account; they stay in the browser's copy.
// lib/library.test.mjs covers these rules.

const ACCOUNT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A game the account can hold: one saved in the database, not one made in this browser. */
export function isAccountGameId(id: string) {
  return ACCOUNT_ID.test(id);
}

function unique(ids: readonly string[]) {
  return [...new Set(ids)];
}

/**
 * The Library to show after signing in, and the browser's games to add to the account.
 * `firstOnDevice` is true when this player has never synced on this device.
 */
export function libraryOnSignIn({
  local,
  remote,
  firstOnDevice,
}: {
  local: readonly string[];
  remote: readonly string[];
  firstOnDevice: boolean;
}): { library: string[]; upload: string[] } {
  const onAccount = new Set(remote);
  const browserOnly = local.filter((id) => !isAccountGameId(id));
  if (!firstOnDevice) return { library: unique([...remote, ...browserOnly]), upload: [] };
  const upload = unique(local.filter((id) => isAccountGameId(id) && !onAccount.has(id)));
  return { library: unique([...remote, ...upload, ...browserOnly]), upload };
}

/** What to add to and remove from the account after the Library changed from `before` to `after`. */
export function libraryChanges(before: readonly string[], after: readonly string[]) {
  const was = new Set(before.filter(isAccountGameId));
  const now = new Set(after.filter(isAccountGameId));
  return {
    added: [...now].filter((id) => !was.has(id)),
    removed: [...was].filter((id) => !now.has(id)),
  };
}
