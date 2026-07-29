import type { Attendee } from './domain/types'

/**
 * Which attendee this browser created for each conference via the Tysons
 * Corner welcome/check-in screen (issue #5). Keyed by conference id, sticky
 * in localStorage so a refresh both skips the welcome screen (App.tsx) and
 * lets the mock repository — which otherwise rebuilds from fixtures on every
 * load — re-seed the attendee it created (mockRepository.ts).
 *
 * Deliberately dependency-free (no repository, no persona import) so both of
 * those can read it without a circular import.
 */
const STORAGE_KEY = 'lts-checkin-attendees-v1'

type Store = Record<string, Attendee>

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    // private mode / blocked storage / no localStorage in this environment
    return {}
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // check-in just won't survive a refresh
  }
}

export function getCheckedInAttendee(conferenceId: string): Attendee | undefined {
  return readStore()[conferenceId]
}

export function hasCheckedIn(conferenceId: string): boolean {
  return getCheckedInAttendee(conferenceId) !== undefined
}

export function storeCheckedInAttendee(attendee: Attendee): void {
  const store = readStore()
  store[attendee.conferenceId] = attendee
  writeStore(store)
}

/** Every attendee this browser has ever checked in as, across all conferences. */
export function getAllCheckedInAttendees(): Attendee[] {
  return Object.values(readStore())
}
