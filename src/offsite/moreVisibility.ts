import { tysonsConference } from './fixtures/conference'

/**
 * Whether More's manual "Organizer mode" toggle should render.
 *
 * Tysons attendees never see the toggle at all — admin mode there is granted
 * automatically by the allowlist at check-in (adminAllowlist.ts), and a
 * visible toggle would imply they can flip it themselves. Austin keeps the
 * toggle exactly as it behaves today.
 */
export function shouldShowOrganizerToggle(conferenceId: string): boolean {
  return conferenceId !== tysonsConference.id
}

/**
 * Whether More's "Viewing as" persona switcher should render.
 *
 * Tysons hides it from non-admins — the allowlist match is the whole admin
 * story there, and letting anyone browse as another attendee would defeat
 * it. Once admin mode is on (via the allowlist), the switcher reappears so
 * an organizer can still spot-check other attendees' views. Austin is
 * unrestricted, same as today.
 */
export function shouldShowPersonaSwitcher(conferenceId: string, adminMode: boolean): boolean {
  if (conferenceId === tysonsConference.id) return adminMode
  return true
}
