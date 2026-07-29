import { describe, expect, it } from 'vitest'
import { getAdminMode, setAdminMode } from './adminMode'
import { conference, tysonsConference } from './fixtures/conference'

describe('adminMode', () => {
  it('defaults to off for any conference', () => {
    expect(getAdminMode(tysonsConference.id)).toBe(false)
    expect(getAdminMode(conference.id)).toBe(false)
  })

  it('is scoped per conference, not a single global flag (issue #14)', () => {
    // Regular Tysons attendee: no organizer mode.
    expect(getAdminMode(tysonsConference.id)).toBe(false)

    // Flipping Austin's manual toggle on must not affect Tysons.
    setAdminMode(conference.id, true)
    expect(getAdminMode(conference.id)).toBe(true)
    expect(getAdminMode(tysonsConference.id)).toBe(false)

    // ...and switching back to Tysons still shows no organizer controls.
    setAdminMode(conference.id, false)
    expect(getAdminMode(tysonsConference.id)).toBe(false)
  })
})
