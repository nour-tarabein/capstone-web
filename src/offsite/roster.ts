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

/**
 * The attendee roster for one conference. Screens that list, search, or match
 * against "the roster" (Home, Schedule, Search, MyEvent, More) read through
 * here rather than importing a fixture directly, so switching the active
 * conference (issue #4) changes what they show.
 */
export function getRoster(conferenceId: string): Roster {
  return rosterByConference.get(conferenceId) ?? EMPTY_ROSTER
}

export function useActiveRoster(): Roster {
  return getRoster(useActiveConferenceId())
}

/**
 * Every known attendee across both conferences, keyed by id. Ids are
 * namespaced per conference (a-/t-), so there is no collision.
 *
 * Used only where identity must resolve independent of whichever conference
 * is currently active — the persona store's stored viewer id, and per-viewer
 * schedule toggles — both of which are expected to survive a city switch even
 * though the viewer may no longer belong to the newly active roster.
 */
export const allAttendeesById: Map<string, Attendee> = new Map([
  ...austinAttendeesById,
  ...tysonsAttendeesById,
])
