import { useSyncExternalStore } from 'react';
import type { Conference } from './domain/types';
import { conferencesById, tysonsConference } from './fixtures/conference';

/**
 * Which conference the app is showing.
 *
 * Same shape as persona.ts / adminMode.ts: module-level state + listeners +
 * useSyncExternalStore, no context providers. Sticky in localStorage so a
 * refresh keeps the same conference. First visit with no stored id defaults to
 * Tysons Corner.
 *
 * Switched from a control in More, near "Exit event" (issue #4). Every screen
 * that shows conference-scoped data — the map's venue, the attendee roster,
 * session-matching, and More's Location card — reads the active conference id
 * from here instead of importing a fixture directly.
 */
const STORAGE_KEY = 'lts-active-conference-id-v1';
const DEFAULT_CONFERENCE_ID = tysonsConference.id;

const listeners = new Set<() => void>();

function readStoredId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && conferencesById.has(stored)) return stored;
  } catch {
    // private mode / blocked storage — fall through
  }
  return DEFAULT_CONFERENCE_ID;
}

function persistId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

let activeConferenceId = readStoredId();
if (!conferencesById.has(activeConferenceId)) activeConferenceId = DEFAULT_CONFERENCE_ID;
persistId(activeConferenceId);

export function getActiveConferenceId(): string {
  return activeConferenceId;
}

export function setActiveConferenceId(id: string): void {
  if (!conferencesById.has(id)) return;
  if (id === activeConferenceId) return;
  activeConferenceId = id;
  persistId(id);
  listeners.forEach((fn) => fn());
}

/** Plain subscribe, shared by the hook below and directly unit-testable. */
export function subscribeToActiveConference(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useActiveConferenceId(): string {
  return useSyncExternalStore(subscribeToActiveConference, getActiveConferenceId);
}

/** The active conference's static fixture (venue, nights, topic tags, ...). */
export function useActiveConference(): Conference {
  const id = useActiveConferenceId();
  // getActiveConferenceId/setActiveConferenceId only ever store a known id.
  return conferencesById.get(id)!;
}
