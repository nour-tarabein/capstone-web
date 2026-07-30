import { describe, expect, it } from 'vitest'
import { createMockRepository } from './mockRepository'
import { conference, tysonsConference } from '../fixtures/conference'

const AUSTIN = conference.id
const TYSONS = tysonsConference.id

const OPENING_RECEPTION = 'official:lts-opening-reception'
const VIEWER_WITHOUT_RSVPS = 'a47'

const TYSONS_OPENING_RECEPTION = 'official:tys-opening-reception'
// t1/t2/t3/t5 are already RSVP'd to the opening reception in rsvpsTysons.ts.
const TYSONS_VIEWER_WITHOUT_RSVPS = 't4'

describe('mockRepository', () => {
  it('getConference returns the seeded Austin conference', async () => {
    const repo = createMockRepository()

    const conf = await repo.getConference(AUSTIN)

    expect(conf.id).toBe('lts-2026')
    expect(conf.name).toBe('Lonestar Tech Summit 2026')
    expect(conf.city).toBe('Austin, TX')
  })

  it('rsvp and cancelRsvp update getGoingCounts', async () => {
    const repo = createMockRepository()

    const before = await repo.getGoingCounts(AUSTIN, [OPENING_RECEPTION])

    await repo.rsvp(AUSTIN, OPENING_RECEPTION, VIEWER_WITHOUT_RSVPS, false)
    const afterRsvp = await repo.getGoingCounts(AUSTIN, [OPENING_RECEPTION])
    expect(afterRsvp[OPENING_RECEPTION]).toBe(before[OPENING_RECEPTION] + 1)

    await repo.cancelRsvp(AUSTIN, OPENING_RECEPTION, VIEWER_WITHOUT_RSVPS)
    const afterCancel = await repo.getGoingCounts(AUSTIN, [OPENING_RECEPTION])
    expect(afterCancel[OPENING_RECEPTION]).toBe(before[OPENING_RECEPTION])
  })

  it('gates getAttendingList until the viewer has RSVP\'d, then returns the full list', async () => {
    const repo = createMockRepository()
    const before = await repo.getGoingCounts(AUSTIN, [OPENING_RECEPTION])

    const gated = await repo.getAttendingList(AUSTIN, OPENING_RECEPTION, VIEWER_WITHOUT_RSVPS)
    expect(gated).toEqual({ gated: true, goingCount: before[OPENING_RECEPTION] })

    await repo.rsvp(AUSTIN, OPENING_RECEPTION, VIEWER_WITHOUT_RSVPS, false)

    const open = await repo.getAttendingList(AUSTIN, OPENING_RECEPTION, VIEWER_WITHOUT_RSVPS)
    expect(open.gated).toBe(false)
    if (open.gated) throw new Error('unreachable')
    expect(open.goingCount).toBe(before[OPENING_RECEPTION] + 1)
    const namedCount = open.groups.reduce((sum, group) => sum + group.people.length, 0)
    expect(namedCount).toBeGreaterThan(0)
  })

  describe('conference scoping', () => {
    it('getConference returns the matching conference for each id', async () => {
      const repo = createMockRepository()

      const austin = await repo.getConference(AUSTIN)
      const tysons = await repo.getConference(TYSONS)

      expect(austin.city).toBe('Austin, TX')
      expect(tysons.city).toBe('McLean, VA')
    })

    it('listEventsForNight never crosses conferences', async () => {
      const repo = createMockRepository()

      const austinEvents = await repo.listEventsForNight(AUSTIN, '2026-07-30')
      const tysonsEvents = await repo.listEventsForNight(TYSONS, '2026-07-30')

      expect(austinEvents.length).toBeGreaterThan(0)
      expect(tysonsEvents.length).toBeGreaterThan(0)
      expect(austinEvents.every((e) => e.conferenceId === AUSTIN)).toBe(true)
      expect(tysonsEvents.every((e) => e.conferenceId === TYSONS)).toBe(true)
      // No id from one conference's slate leaks into the other's.
      const austinIds = new Set(austinEvents.map((e) => e.id))
      expect(tysonsEvents.some((e) => austinIds.has(e.id))).toBe(false)
    })

    it('getEvent scopes lookup to the given conference', async () => {
      const repo = createMockRepository()

      expect(await repo.getEvent(AUSTIN, TYSONS_OPENING_RECEPTION)).toBeNull()
      expect(await repo.getEvent(TYSONS, OPENING_RECEPTION)).toBeNull()
      expect(await repo.getEvent(AUSTIN, OPENING_RECEPTION)).not.toBeNull()
      expect(await repo.getEvent(TYSONS, TYSONS_OPENING_RECEPTION)).not.toBeNull()
    })

    it('rsvp and getGoingCounts stay isolated per conference', async () => {
      const repo = createMockRepository()

      const austinBefore = await repo.getGoingCounts(AUSTIN, [OPENING_RECEPTION])
      const tysonsBefore = await repo.getGoingCounts(TYSONS, [TYSONS_OPENING_RECEPTION])

      await repo.rsvp(TYSONS, TYSONS_OPENING_RECEPTION, TYSONS_VIEWER_WITHOUT_RSVPS, false)

      const austinAfter = await repo.getGoingCounts(AUSTIN, [OPENING_RECEPTION])
      const tysonsAfter = await repo.getGoingCounts(TYSONS, [TYSONS_OPENING_RECEPTION])

      // The Tysons RSVP moved only the Tysons count.
      expect(austinAfter[OPENING_RECEPTION]).toBe(austinBefore[OPENING_RECEPTION])
      expect(tysonsAfter[TYSONS_OPENING_RECEPTION]).toBe(tysonsBefore[TYSONS_OPENING_RECEPTION] + 1)
    })

    it('listPendingEvents and reviewEvent never touch the other conference', async () => {
      const repo = createMockRepository()

      const austinPending = await repo.listPendingEvents(AUSTIN)
      const tysonsPending = await repo.listPendingEvents(TYSONS)
      expect(austinPending.every((e) => e.conferenceId === AUSTIN)).toBe(true)
      expect(tysonsPending.every((e) => e.conferenceId === TYSONS)).toBe(true)

      const tysonsCandidate = tysonsPending[0]
      expect(tysonsCandidate).toBeDefined()

      // Reviewing under the wrong conference id must not approve it.
      await repo.reviewEvent(AUSTIN, tysonsCandidate.id, 'approved')
      const stillPending = await repo.listPendingEvents(TYSONS)
      expect(stillPending.some((e) => e.id === tysonsCandidate.id)).toBe(true)

      await repo.reviewEvent(TYSONS, tysonsCandidate.id, 'approved')
      const approvedAway = await repo.listPendingEvents(TYSONS)
      expect(approvedAway.some((e) => e.id === tysonsCandidate.id)).toBe(false)
    })

    it('submitEvent tags the new event with the given conference id', async () => {
      const repo = createMockRepository()

      await repo.submitEvent(TYSONS, {
        title: 'Placeholder Submission',
        description: '',
        startsAt: '2026-07-30T20:00:00-04:00',
        venueName: 'Somewhere',
        lat: 38.92,
        lng: -77.226,
        submittedByAttendeeId: TYSONS_VIEWER_WITHOUT_RSVPS,
      })

      const pending = await repo.listPendingEvents(TYSONS)
      const submitted = pending.find((e) => e.title === 'Placeholder Submission')
      expect(submitted?.conferenceId).toBe(TYSONS)

      const austinPending = await repo.listPendingEvents(AUSTIN)
      expect(austinPending.some((e) => e.title === 'Placeholder Submission')).toBe(false)
    })

    it('keeps an Austin submission off the map until an organizer approves it', async () => {
      const repo = createMockRepository()
      const title = 'Austin Approval Circuit'

      await repo.submitEvent(AUSTIN, {
        title,
        description: 'Candidate first, map pin second.',
        startsAt: '2026-07-30T20:00:00-05:00',
        venueName: 'Capital Factory',
        lat: 30.2686,
        lng: -97.7409,
        submittedByAttendeeId: 'a1',
      })

      const candidate = (await repo.listPendingEvents(AUSTIN)).find((event) => event.title === title)
      expect(candidate).toMatchObject({
        conferenceId: AUSTIN,
        curationStatus: 'candidate',
        submittedByAttendeeId: 'a1',
      })
      expect((await repo.listEventsForNight(AUSTIN, '2026-07-30')).some((event) => event.title === title))
        .toBe(false)

      await repo.reviewEvent(AUSTIN, candidate!.id, 'approved')

      expect((await repo.listPendingEvents(AUSTIN)).some((event) => event.id === candidate!.id)).toBe(false)
      expect((await repo.listEventsForNight(AUSTIN, '2026-07-30')).some((event) => event.id === candidate!.id))
        .toBe(true)
    })

    it('createAttendee scopes the new attendee to the given conference', async () => {
      const repo = createMockRepository()

      const created = await repo.createAttendee(TYSONS, {
        name: 'Jamie Rivera',
        company: 'Technology',
      })
      expect(created.conferenceId).toBe(TYSONS)

      // The new attendee actually landed in the Tysons bundle (not just a
      // conferenceId label on a detached object): RSVP them to a Tysons event
      // and confirm getAttendingList can resolve them as the viewer, which
      // only works by reading them out of that bundle's attendeesById.
      await repo.rsvp(TYSONS, TYSONS_OPENING_RECEPTION, created.id, false)
      const attending = await repo.getAttendingList(TYSONS, TYSONS_OPENING_RECEPTION, created.id)
      expect(attending.gated).toBe(false)
    })

    it('listRoster scopes to the given conference and includes newly checked-in attendees', async () => {
      const repo = createMockRepository()

      const austinRoster = await repo.listRoster(AUSTIN)
      expect(austinRoster.length).toBeGreaterThan(0)
      expect(austinRoster.every((a) => a.conferenceId === AUSTIN)).toBe(true)

      const created = await repo.createAttendee(TYSONS, {
        name: 'Jamie Rivera',
        company: 'Technology',
      })
      const tysonsRoster = await repo.listRoster(TYSONS)
      expect(tysonsRoster.some((a) => a.id === created.id)).toBe(true)
      expect(austinRoster.some((a) => a.id === created.id)).toBe(false)
    })

    it('getViewer resolves each conference without changing the first-visit viewer id', async () => {
      const repo = createMockRepository()

      const austinViewer = await repo.getViewer(AUSTIN)
      expect(austinViewer.id).toBe(VIEWER_WITHOUT_RSVPS)
      expect(austinViewer.conferenceId).toBe(AUSTIN)

      const tysonsViewer = await repo.getViewer(TYSONS)
      expect(tysonsViewer.id).toBe(tysonsConference.defaultViewerId)
      expect(tysonsViewer.conferenceId).toBe(TYSONS)
    })
  })
})
