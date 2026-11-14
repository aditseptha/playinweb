"use client";

import { useSyncExternalStore } from "react";
import { readTouchDevice } from "@/lib/device";

// Is this a phone or tablet? For the "Plays on your phone" row and the "Best on desktop" label
// (#47). One listener for the whole page, however many cards ask. The server and the first render
// say no, so the page hydrates the same everywhere and phones add their extras right after.

const QUERIES = ["(pointer: coarse)", "(hover: hover)"];

function subscribe(onChange: () => void) {
  const lists = QUERIES.map((q) => window.matchMedia(q));
  for (const l of lists) l.addEventListener("change", onChange);
  return () => {
    for (const l of lists) l.removeEventListener("change", onChange);
  };
}

export function useTouchDevice(): boolean {
  return useSyncExternalStore(subscribe, readTouchDevice, () => false);
}
