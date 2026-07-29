import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { conference, tysonsConference } from './fixtures/conference'

/** Minimal in-memory Storage stand-in — the test env has no real localStorage. */
function fakeLocalStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size
    },
  }
}

describe('checkin', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('localStorage', fakeLocalStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('has not checked in by default', async () => {
    const { hasCheckedIn } = await import('./checkinStorage')
    expect(hasCheckedIn(tysonsConference.id)).toBe(false)
  })

  it('creates an attendee scoped to the conference and adopts it as the viewer', async () => {
    const { checkIn } = await import('./checkin')
    const { getViewerId } = await import('./persona')

    const attendee = await checkIn(tysonsConference.id, {
      firstName: 'Jamie',
      lastName: 'Rivera',
      department: 'Technology',
    })

    expect(attendee.conferenceId).toBe(tysonsConference.id)
    expect(attendee.name).toBe('Jamie Rivera')
    expect(attendee.company).toBe('Technology')
    expect(getViewerId()).toBe(attendee.id)
  })

  it('persists the check-in so hasCheckedIn is true afterwards', async () => {
    const { checkIn } = await import('./checkin')
    const { hasCheckedIn, getCheckedInAttendee } = await import('./checkinStorage')

    expect(hasCheckedIn(tysonsConference.id)).toBe(false)

    const attendee = await checkIn(tysonsConference.id, {
      firstName: 'Jamie',
      lastName: 'Rivera',
      department: 'Technology',
    })

    expect(hasCheckedIn(tysonsConference.id)).toBe(true)
    expect(getCheckedInAttendee(tysonsConference.id)?.id).toBe(attendee.id)
  })

  it('rejects a check-in missing a first or last name', async () => {
    const { checkIn } = await import('./checkin')

    await expect(
      checkIn(tysonsConference.id, { firstName: '  ', lastName: 'Rivera', department: 'Sales' }),
    ).rejects.toThrow()
    await expect(
      checkIn(tysonsConference.id, { firstName: 'Jamie', lastName: '', department: 'Sales' }),
    ).rejects.toThrow()
  })

  it('keeps check-ins for different conferences independent', async () => {
    const { checkIn } = await import('./checkin')
    const { hasCheckedIn } = await import('./checkinStorage')

    await checkIn(tysonsConference.id, {
      firstName: 'Jamie',
      lastName: 'Rivera',
      department: 'Technology',
    })

    expect(hasCheckedIn(tysonsConference.id)).toBe(true)
    expect(hasCheckedIn(conference.id)).toBe(false)
  })

  it('the checked-in identity survives a fresh module load (browser refresh)', async () => {
    const first = await import('./checkin')
    const attendee = await first.checkIn(tysonsConference.id, {
      firstName: 'Jamie',
      lastName: 'Rivera',
      department: 'Technology',
    })

    // Simulate a reload: every module (persona, the mock repository, the
    // checkin store) re-evaluates from scratch, with only localStorage
    // surviving in between.
    vi.resetModules()

    const { hasCheckedIn } = await import('./checkinStorage')
    const { getViewerId } = await import('./persona')
    const { repository } = await import('./data')

    expect(hasCheckedIn(tysonsConference.id)).toBe(true)
    expect(getViewerId()).toBe(attendee.id)
    await expect(repository.getViewer(tysonsConference.id)).resolves.toMatchObject({
      id: attendee.id,
      name: 'Jamie Rivera',
      company: 'Technology',
    })
  })
})
