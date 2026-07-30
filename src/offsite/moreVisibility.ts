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
 * The McLean/Tysons demo hides it for everyone, including organizers. Letting
 * anyone browse as another attendee would undermine the identity established
 * at check-in. Austin remains unrestricted for its presenter-driven demo.
 */
export function shouldShowPersonaSwitcher(conferenceId: string, _adminMode: boolean): boolean {
  if (conferenceId === tysonsConference.id) return false
  return true
}
