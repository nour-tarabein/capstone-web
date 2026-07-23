import { useSyncExternalStore } from 'react';

/**
 * Which attendee you are viewing as.
 *
 * The web build read this from `?as=a2`. React Native has no URL, so the
 * persona is held in memory and switched from the UI instead — which is
 * actually better for the two-phone demo: no retyping URLs on a phone
 * keyboard, just tap a name.
 */
const listeners = new Set<() => void>();
let viewerId = 'a1';

export function getViewerId(): string {
  return viewerId;
}

export function setViewerId(id: string): void {
  if (id === viewerId) return;
  viewerId = id;
  listeners.forEach((fn) => fn());
}

export function useViewerId(): string {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getViewerId,
  );
}
