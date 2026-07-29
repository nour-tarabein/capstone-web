import { describe, expect, it } from 'vitest'
import { tysonsAttendeesById } from './attendeesTysons'
import { tysonsEvents, tysonsPendingSubmissions, tysonsRejectedCandidates } from './eventsTysons'
import { tysonsRsvps } from './rsvpsTysons'

/**
 * Referential integrity for the hand-maintained Tysons seed (issue #8).
 *
 * The seed is four files of literals that reference each other by string id —
 * an RSVP names an attendee and an event, a hosted event names its host. A
 * typo in any of them is silent: the fixture still compiles, and the only
 * symptom is a card that renders a blank host or a going count that is quietly
 * one short. These assertions are what make swapping in real values safe.
 */
describe('tysons seed integrity', () => {
  const eventIds = new Set(
    [...tysonsEvents, ...tysonsPendingSubmissions, ...tysonsRejectedCandidates].map((e) => e.id),
  )

  it('every RSVP names an attendee on the Tysons roster', () => {
    const dangling = tysonsRsvps.filter((r) => !tysonsAttendeesById.has(r.attendeeId))
    expect(dangling.map((r) => `${r.eventId} -> ${r.attendeeId}`)).toEqual([])
  })

  it('every RSVP names a Tysons event', () => {
    const dangling = tysonsRsvps.filter((r) => !eventIds.has(r.eventId))
    expect(dangling.map((r) => r.eventId)).toEqual([])
  })

  it('every attendee-hosted event names a real host', () => {
    const dangling = [...tysonsEvents, ...tysonsPendingSubmissions].filter(
      (e) => e.submittedByAttendeeId && !tysonsAttendeesById.has(e.submittedByAttendeeId),
    )
    expect(dangling.map((e) => e.id)).toEqual([])
  })

  it('has no duplicate event ids', () => {
    const ids = [...eventIds]
    const all = [...tysonsEvents, ...tysonsPendingSubmissions, ...tysonsRejectedCandidates]
    expect(all.length).toBe(ids.length)
  })

  it('leaves no approved event with a zero going count', () => {
    const rsvpdEventIds = new Set(tysonsRsvps.map((r) => r.eventId))
    const empty = tysonsEvents.filter((e) => !rsvpdEventIds.has(e.id))
    expect(empty.map((e) => e.title)).toEqual([])
  })
})
