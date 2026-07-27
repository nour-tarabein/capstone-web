import { useSyncExternalStore } from 'react';
import { attendeesById } from './fixtures/attendees';

/**
 * Which attendee you are viewing as.
 *
 * Sticky in localStorage so a refresh keeps the same persona. First visit with
 * no stored id defaults to Abhinav (a47) — the presenter identity. Shared
 * cross-device claims are not wired yet; every fresh browser starts as Abhinav
 * until switched in More. Key is versioned so a roster rewrite doesn't leave
 * browsers stuck on a retired fictional persona (e.g. old a3 = Priya).
 */
const STORAGE_KEY = 'lts-viewer-id-v2';
const DEFAULT_VIEWER_ID = 'a47';

const listeners = new Set<() => void>();

function readStoredId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && attendeesById.has(stored)) return stored;
  } catch {
    // private mode / blocked storage — fall through
  }
  return DEFAULT_VIEWER_ID;
}

function persistId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

let viewerId = readStoredId();
if (!attendeesById.has(viewerId)) viewerId = DEFAULT_VIEWER_ID;
persistId(viewerId);

export function getViewerId(): string {
  return viewerId;
}

export function setViewerId(id: string): void {
  if (!attendeesById.has(id)) return;
  if (id === viewerId) return;
  viewerId = id;
  persistId(id);
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
