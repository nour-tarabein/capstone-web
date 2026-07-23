import { useSyncExternalStore } from 'react';

/**
 * Whether the app is showing the organizer's view.
 *
 * This is a DEMO AFFORDANCE, not a security boundary. In production the
 * organizer console is a different surface behind a different login, and the
 * events an attendee may review would be decided by a role claim on the
 * server. Here it is a switch in More, so one build on one phone can show both
 * sides of the approval loop without signing out.
 *
 * The honest version of that limitation lives next to event_review() in
 * supabase/schema.sql: the RPC is granted to anon, so the gate this toggle
 * represents is currently enforced by the UI alone. Everything else about the
 * approval flow — that a candidate is invisible to the map until approved — is
 * enforced in Postgres and does not depend on this flag at all.
 *
 * Same shape as persona.ts: in-memory, no persistence, reset on reload.
 */
const listeners = new Set<() => void>();
let adminMode = false;

export function getAdminMode(): boolean {
  return adminMode;
}

export function setAdminMode(next: boolean): void {
  if (next === adminMode) return;
  adminMode = next;
  listeners.forEach((fn) => fn());
}

export function useAdminMode(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getAdminMode,
  );
}
