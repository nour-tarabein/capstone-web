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
  ['eventbrite:tys-eb-real-estate-investing', ['t26', 't31', 't33']],
  ['eventbrite:tys-eb-greenhouse-happy-hour', ['t35', 't49']],
  ['luma:luma-tys-fintech-founders-hh', ['t27', 't29', 't44']],
  ['partiful:ptf-tys-founders-dinner', ['t8', 't13']],
  ['shotgun:sg-tys-rooftop-social', ['t15', 't21', 't48']],
  ['attendee:tys-host-ceo-roundtable', ['t1', 't2', 't6']],

  // Attendee-proposed happy hours (happyHoursTysons.ts). The host is counted
  // as going to their own event; the rest are spread across the roster so no
  // pin opens at "0 going" (DESIGN.md #8).
  ['attendee:tys-hh-founding-farmers', ['t26', 't28', 't30'], ['t45']],
  ['attendee:tys-hh-north-italia', ['t15', 't18', 't21'], ['t34']],
  ['attendee:tys-hh-barrel-bushel', ['t33', 't36', 't37']],
  ['attendee:tys-hh-eddie-v', ['t29', 't27', 't31', 't41']],
  ['attendee:tys-hh-agora', ['t11', 't16', 't43']],
  ['attendee:tys-hh-the-palm', ['t32', 't24', 't50'], ['t51']],
  ['attendee:tys-hh-shipgarten', ['t7', 't13', 't55', 't25'], ['t39']],
  ['attendee:tys-hh-ometeo', ['t46', 't47', 't49']],
  ['attendee:tys-hh-yard-house', ['t19', 't17', 't35', 't52'], ['t53']],
  ['attendee:tys-hh-earls', ['t14', 't22', 't54'], ['t23']],
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
