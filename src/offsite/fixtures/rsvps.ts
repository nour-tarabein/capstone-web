import type { Rsvp } from '../domain/types'

/**
 * Seeded RSVPs. Official events carry heavy pre-existing attendance because
 * the event platform already holds those registration lists — this is the cold-start
 * answer, not decoration (DESIGN.md #8).
 *
 * The viewer (a1) deliberately has NO RSVPs at start, so the reciprocity gate
 * is closed when the demo begins and opening it is a live beat.
 */
type Seed = [eventId: string, attendeeIds: string[], anonymousIds?: string[]]

const seeds: Seed[] = [
  // Official — pre-seeded from conference registration.
  ['official:lts-opening-reception', ['a2', 'a3', 'a5', 'a6', 'a7', 'a8', 'a10', 'a11', 'a15', 'a16', 'a17', 'a20'], ['a9']],
  ['official:lts-sponsor-hh', ['a4', 'a10', 'a13', 'a18', 'a2', 'a11', 'a16'], ['a14']],
  ['official:lts-closing-party', ['a2', 'a3', 'a5', 'a6', 'a8', 'a12', 'a15', 'a17', 'a19', 'a20'], ['a9', 'a14']],

  // Third-party — organic, thinner.
  ['partiful:ptf-ai-founders-dinner', ['a2', 'a5', 'a6', 'a7', 'a12', 'a15'], ['a9']],
  ['luma:luma-devtools-hh', ['a6', 'a8', 'a11', 'a16', 'a18']],
  ['partiful:ptf-design-systems-dinner', ['a3', 'a8', 'a17', 'a20']],
  ['luma:luma-fintech-after-hours', ['a4', 'a10', 'a13', 'a18']],
  ['luma:luma-ai-infra-meetup', ['a5', 'a6', 'a7', 'a11', 'a12']],
  ['partiful:ptf-climate-nightcap', ['a12', 'a19']],
  ['eventbrite:eb-startup-crawl', ['a11', 'a16', 'a2']],
  ['eventbrite:eb-stubbs-live', ['a10', 'a20']],
  ['eventbrite:eb-barton-springs', ['a19']],
]

export const rsvps: Rsvp[] = seeds.flatMap(([eventId, attendeeIds, anonymousIds = []]) => [
  ...attendeeIds.map((attendeeId) => make(eventId, attendeeId, false)),
  ...anonymousIds.map((attendeeId) => make(eventId, attendeeId, true)),
])

function make(eventId: string, attendeeId: string, anonymous: boolean): Rsvp {
  return {
    id: `${eventId}::${attendeeId}`,
    eventId,
    attendeeId,
    createdAt: '2026-09-01T12:00:00-05:00',
    anonymous,
  }
}
