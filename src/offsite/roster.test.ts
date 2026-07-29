import { describe, expect, it } from 'vitest'
import { allAttendeesById, getRoster } from './roster'
import { conference, tysonsConference } from './fixtures/conference'

describe('roster', () => {
  it('scopes the Austin roster to Austin attendees only', () => {
    const roster = getRoster(conference.id)

    expect(roster.attendees.length).toBeGreaterThan(0)
    expect(roster.attendees.every((a) => a.conferenceId === conference.id)).toBe(true)
    expect(roster.attendeesById.get('a47')?.name).toBe('Abhinav Pappu')
    expect(roster.attendeesById.has('t1')).toBe(false)
  })

  it('scopes the Tysons roster to Tysons attendees only', () => {
    const roster = getRoster(tysonsConference.id)

    expect(roster.attendees.length).toBeGreaterThan(0)
    expect(roster.attendees.every((a) => a.conferenceId === tysonsConference.id)).toBe(true)
    expect(roster.attendeesById.has('a47')).toBe(false)
  })

  it('returns an empty roster for an unknown conference id', () => {
    const roster = getRoster('not-a-real-conference')

    expect(roster.attendees).toEqual([])
    expect(roster.attendeesById.size).toBe(0)
  })

  it('merges both rosters into allAttendeesById with no id collisions', () => {
    const austin = getRoster(conference.id)
    const tysons = getRoster(tysonsConference.id)

    expect(allAttendeesById.size).toBe(austin.attendees.length + tysons.attendees.length)
    expect(allAttendeesById.get('a47')?.conferenceId).toBe(conference.id)
    expect(allAttendeesById.get('t1')?.conferenceId).toBe(tysonsConference.id)
  })
})
