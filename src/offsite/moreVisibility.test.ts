import { describe, expect, it } from 'vitest'
import { conference, tysonsConference } from './fixtures/conference'
import { shouldShowOrganizerToggle, shouldShowPersonaSwitcher } from './moreVisibility'

describe('shouldShowOrganizerToggle', () => {
  it('is hidden for Tysons, admin or not', () => {
    expect(shouldShowOrganizerToggle(tysonsConference.id)).toBe(false)
  })

  it('is shown for Austin, unaffected by the allowlist', () => {
    expect(shouldShowOrganizerToggle(conference.id)).toBe(true)
  })
})

describe('shouldShowPersonaSwitcher', () => {
  it('is hidden for a non-admin Tysons attendee', () => {
    expect(shouldShowPersonaSwitcher(tysonsConference.id, false)).toBe(false)
  })

  it('is shown for an admin Tysons attendee', () => {
    expect(shouldShowPersonaSwitcher(tysonsConference.id, true)).toBe(true)
  })

  it('is always shown on Austin, admin or not', () => {
    expect(shouldShowPersonaSwitcher(conference.id, false)).toBe(true)
    expect(shouldShowPersonaSwitcher(conference.id, true)).toBe(true)
  })
})
