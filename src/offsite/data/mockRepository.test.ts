import { describe, expect, it } from 'vitest'
import { createMockRepository } from './mockRepository'

const OPENING_RECEPTION = 'official:lts-opening-reception'
const VIEWER_WITHOUT_RSVPS = 'a47'

describe('mockRepository', () => {
  it('getConference returns the seeded Austin conference', async () => {
    const repo = createMockRepository()

    const conference = await repo.getConference()

    expect(conference.id).toBe('lts-2026')
    expect(conference.name).toBe('Lonestar Tech Summit 2026')
    expect(conference.city).toBe('Austin, TX')
  })

  it('rsvp and cancelRsvp update getGoingCounts', async () => {
    const repo = createMockRepository()

    const before = await repo.getGoingCounts([OPENING_RECEPTION])

    await repo.rsvp(OPENING_RECEPTION, VIEWER_WITHOUT_RSVPS, false)
    const afterRsvp = await repo.getGoingCounts([OPENING_RECEPTION])
    expect(afterRsvp[OPENING_RECEPTION]).toBe(before[OPENING_RECEPTION] + 1)

    await repo.cancelRsvp(OPENING_RECEPTION, VIEWER_WITHOUT_RSVPS)
    const afterCancel = await repo.getGoingCounts([OPENING_RECEPTION])
    expect(afterCancel[OPENING_RECEPTION]).toBe(before[OPENING_RECEPTION])
  })

  it('gates getAttendingList until the viewer has RSVP\'d, then returns the full list', async () => {
    const repo = createMockRepository()
    const before = await repo.getGoingCounts([OPENING_RECEPTION])

    const gated = await repo.getAttendingList(OPENING_RECEPTION, VIEWER_WITHOUT_RSVPS)
    expect(gated).toEqual({ gated: true, goingCount: before[OPENING_RECEPTION] })

    await repo.rsvp(OPENING_RECEPTION, VIEWER_WITHOUT_RSVPS, false)

    const open = await repo.getAttendingList(OPENING_RECEPTION, VIEWER_WITHOUT_RSVPS)
    expect(open.gated).toBe(false)
    if (open.gated) throw new Error('unreachable')
    expect(open.goingCount).toBe(before[OPENING_RECEPTION] + 1)
    const namedCount = open.groups.reduce((sum, group) => sum + group.people.length, 0)
    expect(namedCount).toBeGreaterThan(0)
  })
})
