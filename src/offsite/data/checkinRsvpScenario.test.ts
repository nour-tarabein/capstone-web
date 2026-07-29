import { describe, expect, it } from 'vitest'
import { createMockRepository } from './mockRepository'
import { tysonsConference } from '../fixtures/conference'

/**
 * Issue #7 acceptance criterion: check in several attendees, RSVP a subset of
 * them to a pre-approved event, and confirm the reciprocity gate holds — an
 * RSVP'd attendee sees the other RSVP'd attendees, a non-RSVP'd attendee stays
 * gated to a count.
 *
 * Runs against createMockRepository() rather than a live Supabase project:
 * this test suite has no database to talk to, and the mock repository
 * implements the identical Repository contract the live one does — including
 * the same reciprocity rule the attending_list() function enforces in
 * supabase/schema.sql (see mockRepository.ts's getAttendingList). A fresh
 * repository per test is the reset between runs: nothing persists across
 * `createMockRepository()` calls.
 */
describe('Tysons check-in + RSVP reciprocity scenario', () => {
  const TYSONS = tysonsConference.id
  const EVENT = 'official:tys-opening-reception'

  it('lets RSVPd attendees see each other while a non-RSVPd attendee stays gated', async () => {
    const repo = createMockRepository()

    const alice = await repo.createAttendee(TYSONS, { name: 'Alice Chen', company: 'Engineering' })
    const bob = await repo.createAttendee(TYSONS, { name: 'Bob Diaz', company: 'Design' })
    const casey = await repo.createAttendee(TYSONS, { name: 'Casey Nguyen', company: 'Sales' })

    const before = await repo.getGoingCounts(TYSONS, [EVENT])

    await repo.rsvp(TYSONS, EVENT, alice.id, false)
    await repo.rsvp(TYSONS, EVENT, bob.id, false)
    // Casey checked in but never RSVPs — the case the gate exists for.

    const afterRsvps = await repo.getGoingCounts(TYSONS, [EVENT])
    expect(afterRsvps[EVENT]).toBe(before[EVENT] + 2)

    const aliceView = await repo.getAttendingList(TYSONS, EVENT, alice.id)
    expect(aliceView.gated).toBe(false)
    if (aliceView.gated) throw new Error('unreachable')
    const aliceSeesBob = aliceView.groups
      .flatMap((g) => g.people)
      .some((p) => p.attendee.id === bob.id)
    expect(aliceSeesBob).toBe(true)

    const bobView = await repo.getAttendingList(TYSONS, EVENT, bob.id)
    expect(bobView.gated).toBe(false)
    if (bobView.gated) throw new Error('unreachable')
    const bobSeesAlice = bobView.groups
      .flatMap((g) => g.people)
      .some((p) => p.attendee.id === alice.id)
    expect(bobSeesAlice).toBe(true)

    const caseyView = await repo.getAttendingList(TYSONS, EVENT, casey.id)
    expect(caseyView).toEqual({ gated: true, goingCount: afterRsvps[EVENT] })
  })

  it('resets between test runs — a fresh repository has none of the previous test\'s check-ins or RSVPs', async () => {
    const repo = createMockRepository()

    // Only the seeded fixture RSVPs (t1, t2, t3 named + t5 anonymous) — Alice
    // and Bob from the previous test do not leak into this repository.
    const counts = await repo.getGoingCounts(TYSONS, [EVENT])
    expect(counts[EVENT]).toBe(4)

    const roster = await repo.listRoster(TYSONS)
    expect(roster.some((a) => a.name === 'Alice Chen')).toBe(false)
  })
})
