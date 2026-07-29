import type { Attendee } from './domain/types'
import { repository } from './data'
import { setViewerId } from './persona'
import { storeCheckedInAttendee } from './checkinStorage'
import { isAllowlistedAdmin } from './adminAllowlist'
import { setAdminMode } from './adminMode'
import { tysonsConference } from './fixtures/conference'

export interface CheckInInput {
  firstName: string
  lastName: string
  department: string
}

/**
 * Creates a real attendee for this browser, scoped to `conferenceId`, and
 * makes it the viewer persona — the Tysons Corner welcome/check-in screen
 * (issue #5). Kept free of any rendering so the create → persist → adopt path
 * is unit-testable without mounting the form.
 *
 * Order matters: the attendee is persisted to checkinStorage *before*
 * setViewerId runs, since setViewerId's validity check consults that same
 * store for ids outside the static fixture roster.
 *
 * At Tysons Corner, a name that matches the hardcoded admin allowlist
 * (issue #6) flips organizer mode on automatically — there is no manual
 * toggle for Tysons attendees to find.
 */
export async function checkIn(conferenceId: string, input: CheckInInput): Promise<Attendee> {
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  if (!firstName || !lastName) {
    throw new Error('First and last name are required to check in.')
  }

  const attendee = await repository.createAttendee(conferenceId, {
    name: `${firstName} ${lastName}`,
    company: input.department,
  })

  storeCheckedInAttendee(attendee)
  setViewerId(attendee.id)

  if (conferenceId === tysonsConference.id && isAllowlistedAdmin(firstName, lastName)) {
    setAdminMode(true)
  }

  return attendee
}
