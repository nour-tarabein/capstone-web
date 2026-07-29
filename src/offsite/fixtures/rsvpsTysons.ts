import type { Rsvp } from '../domain/types'

/**
 * Placeholder RSVPs for the Tysons Corner fixture — structurally identical to
 * fixtures/rsvps.ts. Gives the placeholder events a non-zero going count so
 * the mock repository's conference scoping has something to prove: these ids
 * must never show up in an Austin going count, and vice versa.
 */
type Seed = [eventId: string, attendeeIds: string[], anonymousIds?: string[]]

const seeds: Seed[] = [
  ['official:tys-opening-reception', ['t1', 't2', 't3'], ['t5']],
  ['eventbrite:tys-eb-placeholder-mixer', ['t2', 't4']],
  ['attendee:tys-host-placeholder-meetup', ['t1', 't2', 't6']],
]

export const tysonsRsvps: Rsvp[] = seeds.flatMap(([eventId, attendeeIds, anonymousIds = []]) => [
  ...attendeeIds.map((attendeeId) => make(eventId, attendeeId, false)),
  ...anonymousIds.map((attendeeId) => make(eventId, attendeeId, true)),
])

function make(eventId: string, attendeeId: string, anonymous: boolean): Rsvp {
  return {
    id: `${eventId}::${attendeeId}`,
    eventId,
    attendeeId,
    createdAt: '2026-07-20T12:00:00-04:00',
    anonymous,
  }
}
