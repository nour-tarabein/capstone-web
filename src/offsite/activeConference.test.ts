import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { conference, tysonsConference } from './fixtures/conference'

const STORAGE_KEY = 'lts-active-conference-id-v1'

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

describe('activeConference', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('localStorage', fakeLocalStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to Tysons Corner for a browser with no stored preference', async () => {
    const { getActiveConferenceId } = await import('./activeConference')
    expect(getActiveConferenceId()).toBe(tysonsConference.id)
  })

  it('falls back to the default when the stored id is not a known conference', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-a-real-conference')
    const { getActiveConferenceId } = await import('./activeConference')
    expect(getActiveConferenceId()).toBe(tysonsConference.id)
  })

  it('set updates get and persists to localStorage', async () => {
    const { getActiveConferenceId, setActiveConferenceId } = await import('./activeConference')

    setActiveConferenceId(conference.id)

    expect(getActiveConferenceId()).toBe(conference.id)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(conference.id)
  })

  it('ignores an id for an unknown conference', async () => {
    const { getActiveConferenceId, setActiveConferenceId } = await import('./activeConference')

    setActiveConferenceId('not-a-real-conference')

    expect(getActiveConferenceId()).toBe(tysonsConference.id)
  })

  it('is sticky across a fresh module load', async () => {
    const first = await import('./activeConference')
    first.setActiveConferenceId(conference.id)

    vi.resetModules()
    const second = await import('./activeConference')

    expect(second.getActiveConferenceId()).toBe(conference.id)
  })

  it('subscribe fires listeners on a real change and not on a no-op set', async () => {
    const { setActiveConferenceId, subscribeToActiveConference, getActiveConferenceId } =
      await import('./activeConference')

    const listener = vi.fn()
    const unsubscribe = subscribeToActiveConference(listener)

    setActiveConferenceId(getActiveConferenceId()) // no-op: already the current id
    expect(listener).not.toHaveBeenCalled()

    setActiveConferenceId(conference.id)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    setActiveConferenceId(tysonsConference.id)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
