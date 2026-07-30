import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('viewer resolution', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('localStorage', fakeLocalStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the first-visit viewer default when it belongs to Austin', async () => {
    const { conference } = await import('./fixtures/conference')
    const { getViewerId } = await import('./persona')
    const { resolveViewer } = await import('./viewerResolution')

    expect(getViewerId()).toBe('a47')
    expect(resolveViewer(conference.id, getViewerId())).toMatchObject({
      id: 'a47',
      name: 'Abhinav Pappu',
    })
  })

  it('falls back to Reggie in Austin without overwriting a Tysons viewer', async () => {
    const { conference, tysonsConference } = await import('./fixtures/conference')
    const { getViewerId, setViewerId } = await import('./persona')
    const { resolveViewer } = await import('./viewerResolution')

    setViewerId('t4')

    expect(resolveViewer(conference.id, getViewerId())).toMatchObject({
      id: 'a1',
      name: 'Reggie Aggarwal',
      title: 'CEO',
    })
    expect(getViewerId()).toBe('t4')
    expect(resolveViewer(tysonsConference.id, getViewerId()).id).toBe('t4')
  })

  it("uses this browser's conference check-in when the stored viewer is elsewhere", async () => {
    const { tysonsConference } = await import('./fixtures/conference')
    const { storeCheckedInAttendee } = await import('./checkinStorage')
    const { resolveViewer } = await import('./viewerResolution')

    storeCheckedInAttendee({
      id: 'checkin:lts-tysons-2026:local',
      conferenceId: tysonsConference.id,
      name: 'Jamie Rivera',
      title: '',
      company: 'Technology',
      photoUrl: '',
      interests: [],
      sessionIds: [],
      directoryOptIn: true,
    })

    expect(resolveViewer(tysonsConference.id, 'a47')).toMatchObject({
      id: 'checkin:lts-tysons-2026:local',
      name: 'Jamie Rivera',
    })
  })

  it('resolves a check-in from another device after it reaches the live roster', async () => {
    const { tysonsConference } = await import('./fixtures/conference')
    const { tysonsAttendees } = await import('./fixtures/attendeesTysons')
    const { resolveViewer } = await import('./viewerResolution')
    const { setLiveRoster } = await import('./roster')
    const remoteAttendee = {
      id: 'checkin:lts-tysons-2026:remote',
      conferenceId: tysonsConference.id,
      name: 'Morgan Lee',
      title: '',
      company: 'Engineering',
      photoUrl: '',
      interests: [],
      sessionIds: [],
      directoryOptIn: true,
    }

    setLiveRoster(tysonsConference.id, [...tysonsAttendees, remoteAttendee])

    expect(resolveViewer(tysonsConference.id, remoteAttendee.id)).toEqual(remoteAttendee)
  })
})
