import { useSyncExternalStore } from 'react';

/**
 * Whether the app is showing the organizer's view, keyed by conference id.
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
 * Scoped per conference (issue #14) so flipping Austin's manual toggle, or
 * matching Tysons's admin allowlist at check-in, can't leak into whichever
 * conference the viewer switches to next. Same shape as persona.ts
 * otherwise: in-memory, no persistence, reset on reload.
 */
const listeners = new Set<() => void>();
const adminModeByConference = new Map<string, boolean>();

export function getAdminMode(conferenceId: string): boolean {
  return adminModeByConference.get(conferenceId) ?? false;
}

export function setAdminMode(conferenceId: string, next: boolean): void {
  if (next === getAdminMode(conferenceId)) return;
  adminModeByConference.set(conferenceId, next);
  listeners.forEach((fn) => fn());
}

export function useAdminMode(conferenceId: string): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => getAdminMode(conferenceId),
  );
}
