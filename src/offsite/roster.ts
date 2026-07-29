import { useSyncExternalStore } from 'react'
import type { Attendee } from './domain/types'
import { useActiveConferenceId } from './activeConference'
import { attendees as austinAttendees, attendeesById as austinAttendeesById } from './fixtures/attendees'
import { tysonsAttendees, tysonsAttendeesById } from './fixtures/attendeesTysons'
import { conference, tysonsConference } from './fixtures/conference'

export interface Roster {
  attendees: Attendee[]
  attendeesById: Map<string, Attendee>
}

const EMPTY_ROSTER: Roster = { attendees: [], attendeesById: new Map() }

const rosterByConference = new Map<string, Roster>([
  [conference.id, { attendees: austinAttendees, attendeesById: austinAttendeesById }],
  [tysonsConference.id, { attendees: tysonsAttendees, attendeesById: tysonsAttendeesById }],
])

const listeners = new Set<() => void>()

/**
 * The attendee roster for one conference. Screens that list, search, or match
 * against "the roster" (Home, Schedule, Search, MyEvent, More) read through
 * here rather than importing a fixture directly, so switching the active
 * conference (issue #4) changes what they show.
 */
export function getRoster(conferenceId: string): Roster {
  return rosterByConference.get(conferenceId) ?? EMPTY_ROSTER
}

/**
 * Swaps in a roster fetched live from Supabase (issue #7). Called from
 * data/index.ts's useLiveRosterSync, not from here — this module
 * deliberately never imports the repository layer. The repository layer
 * imports persona.ts, and persona.ts imports this module for
 * allAttendeesById; roster.ts importing back into the repository layer would
 * close that into a cycle and leave allAttendeesById uninitialized the first
 * time any of these modules loads.
 */
export function setLiveRoster(conferenceId: string, attendees: Attendee[]): void {
  const attendeesById = new Map(attendees.map((a) => [a.id, a]))
  rosterByConference.set(conferenceId, { attendees, attendeesById })
  for (const [id, attendee] of attendeesById) allAttendeesById.set(id, attendee)
  listeners.forEach((fn) => fn())
}

export function useActiveRoster(): Roster {
  const conferenceId = useActiveConferenceId()
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => getRoster(conferenceId),
  )
}

/**
 * Every known attendee across both conferences, keyed by id. Ids are
 * namespaced per conference (a-/t-), so there is no collision.
 *
 * Used only where identity must resolve independent of whichever conference
 * is currently active — the persona store's stored viewer id, and per-viewer
 * schedule toggles — both of which are expected to survive a city switch even
 * though the viewer may no longer belong to the newly active roster.
 *
 * A live roster refresh (issue #7) merges into this map rather than replacing
 * it, so it only ever grows — fine for a browser session, and it keeps the
 * "does this id belong to anyone" checks in persona.ts working for attendees
 * who checked in on someone else's phone.
 */
export const allAttendeesById: Map<string, Attendee> = new Map([
  ...austinAttendeesById,
  ...tysonsAttendeesById,
])
