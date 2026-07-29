import type { Attendee } from './domain/types'
import { useActiveConferenceId } from './activeConference'
import { getCheckedInAttendee } from './checkinStorage'
import { conferencesById } from './fixtures/conference'
import { getRoster, useActiveRoster } from './roster'
import { useViewerId } from './persona'

/**
 * Resolves the viewer for one conference without changing the stored viewer id.
 *
 * The browser's own check-in is preferred over the conference default when the
 * stored identity belongs elsewhere. This restores a Tysons check-in after a
 * temporary switch to an Austin persona.
 */
export function resolveViewer(conferenceId: string, viewerId: string): Attendee {
  const roster = getRoster(conferenceId)
  const rosterViewer = roster.attendeesById.get(viewerId)
  if (rosterViewer) return rosterViewer

  const checkedInViewer = getCheckedInAttendee(conferenceId)
  if (checkedInViewer) return checkedInViewer

  const conference = conferencesById.get(conferenceId)
  const defaultViewer = conference
    ? roster.attendeesById.get(conference.defaultViewerId)
    : undefined
  if (defaultViewer) return defaultViewer

  throw new Error(`No viewer can be resolved for conference ${conferenceId}`)
}

/** Reactive wrapper only; all resolution behavior lives in resolveViewer. */
export function useViewer(): Attendee {
  const conferenceId = useActiveConferenceId()
  const viewerId = useViewerId()
  useActiveRoster()
  return resolveViewer(conferenceId, viewerId)
}
