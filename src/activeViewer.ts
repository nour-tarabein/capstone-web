import type { Attendee } from './offsite/domain/types';
import type { Roster } from './offsite/roster';
import { useActiveRoster } from './offsite/roster';
import { useActiveConferenceId } from './offsite/activeConference';
import { getCheckedInAttendee } from './offsite/checkinStorage';
import { useViewerId } from './offsite/persona';

/** Austin's default pitch-demo persona, kept in step with persona.ts. */
const AUSTIN_DEMO_VIEWER_ID = 'a47';

/**
 * Resolves the stored persona against the conference currently on screen.
 *
 * A persona can legitimately remain stored while the user switches cities,
 * but that attendee cannot RSVP in the other conference. Prefer this
 * browser's attendee for the active conference, then Austin's presenter, then
 * the first available roster member so event actions never lose an identity.
 */
export function resolveActiveViewer(
  conferenceId: string,
  roster: Roster,
  storedViewerId: string,
  checkedInAttendee?: Attendee,
): Attendee | null {
  const selected = roster.attendeesById.get(storedViewerId);
  if (selected) return selected;

  if (checkedInAttendee?.conferenceId === conferenceId) return checkedInAttendee;

  return (
    roster.attendeesById.get(AUSTIN_DEMO_VIEWER_ID) ??
    roster.attendees[0] ??
    null
  );
}

/**
 * Web-only conference-aware viewer hook. Keeping this outside src/offsite/
 * avoids changing the shared mobile domain/state module.
 */
export function useActiveViewer(): Attendee | null {
  const conferenceId = useActiveConferenceId();
  const roster = useActiveRoster();
  const storedViewerId = useViewerId();
  return resolveActiveViewer(
    conferenceId,
    roster,
    storedViewerId,
    getCheckedInAttendee(conferenceId),
  );
}
