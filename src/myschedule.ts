import { useSyncExternalStore } from 'react';
import { attendeesById } from './offsite/fixtures/attendees';

/**
 * Sessions the viewer added on top of what their persona pre-registered for.
 * Kept per persona so switching the demo persona switches schedules too, and
 * in memory only so a refresh resets the demo — same rules as the RSVPs.
 */
const added = new Map<string, Set<string>>();
const removed = new Map<string, Set<string>>();
const listeners = new Set<() => void>();
let version = 0;

function bucket(map: Map<string, Set<string>>, viewerId: string): Set<string> {
  let set = map.get(viewerId);
  if (!set) {
    set = new Set();
    map.set(viewerId, set);
  }
  return set;
}

function emit() {
  version++;
  listeners.forEach((l) => l());
}

export function isOnSchedule(viewerId: string, sessionId: string): boolean {
  if (bucket(removed, viewerId).has(sessionId)) return false;
  if (bucket(added, viewerId).has(sessionId)) return true;
  return attendeesById.get(viewerId)?.sessionIds.includes(sessionId) ?? false;
}

export function toggleSession(viewerId: string, sessionId: string): boolean {
  const nowOn = !isOnSchedule(viewerId, sessionId);
  if (nowOn) {
    bucket(removed, viewerId).delete(sessionId);
    if (!attendeesById.get(viewerId)?.sessionIds.includes(sessionId)) {
      bucket(added, viewerId).add(sessionId);
    }
  } else {
    bucket(added, viewerId).delete(sessionId);
    if (attendeesById.get(viewerId)?.sessionIds.includes(sessionId)) {
      bucket(removed, viewerId).add(sessionId);
    }
  }
  emit();
  return nowOn;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Re-renders on any schedule change; read with isOnSchedule(). */
export function useScheduleVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}
