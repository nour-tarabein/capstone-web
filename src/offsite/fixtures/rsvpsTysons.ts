import type { Rsvp } from '../domain/types'

/**
 * Pre-seeded RSVPs for the Tysons Corner fixture — structurally identical to
 * fixtures/rsvps.ts. Gives the real-venue events a non-zero going count so
 * the mock repository's conference scoping has something to prove: these ids
 * must never show up in an Austin going count, and vice versa.
 *
 * The opening reception's RSVP list (t1, t2, t3 named + t5 anonymous — 4
 * total) is pinned by mockRepository.test.ts and checkinRsvpScenario.test.ts.
 * t4 is deliberately excluded from it (used as the "viewer without RSVPs"
 * fixture) but may still RSVP to other events below.
 */
type Seed = [eventId: string, attendeeIds: string[], anonymousIds?: string[]]

const seeds: Seed[] = [
  ['official:tys-opening-reception', ['t1', 't2', 't3'], ['t5']],
  ['eventbrite:tys-eb-cocktail-contest', ['t2', 't4'], ['t46']],
  ['luma:luma-tys-fintech-founders-hh', ['t27', 't29', 't44']],
  ['partiful:ptf-tys-founders-dinner', ['t8', 't13']],
  ['shotgun:sg-tys-rooftop-social', ['t15', 't21', 't48']],
  ['attendee:tys-host-ceo-roundtable', ['t1', 't2', 't6']],
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
