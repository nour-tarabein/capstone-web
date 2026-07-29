import type { Attendee } from '../domain/types'
import { tysonsConference } from './conference'

type Seed = [
  id: string,
  name: string,
  title: string,
  company: string,
  interests: string[],
  sessionIds: string[],
]

/**
 * Placeholder personnel for the Tysons Corner fixture — structurally identical
 * to fixtures/attendees.ts, but nobody real. Exists so the conference-scoped
 * data prefactor has a second roster to scope against in tests; no screen
 * reads this yet.
 */
const seeds: Seed[] = [
  ['t1', 'Placeholder Attendee One', 'Organizer', 'Operations', ['AI', 'FinTech'], ['s1']],
  ['t2', 'Placeholder Attendee Two', 'Engineer', 'Technology', ['DevTools', 'AI'], ['s3']],
  ['t3', 'Placeholder Attendee Three', 'Designer', 'Design', ['Design'], ['s2']],
  ['t4', 'Placeholder Attendee Four', 'Analyst', 'Finance', ['FinTech'], ['s4']],
  ['t5', 'Placeholder Attendee Five', 'Engineer', 'Technology', ['DevTools'], ['s3']],
  ['t6', 'Placeholder Attendee Six', 'Coordinator', 'Marketing', ['Design', 'Climate'], ['s6']],
]

export const tysonsAttendees: Attendee[] = seeds.map(
  ([id, name, title, company, interests, sessionIds]) => ({
    id,
    conferenceId: tysonsConference.id,
    name,
    title,
    company,
    photoUrl: '',
    interests,
    sessionIds,
    directoryOptIn: true,
  }),
)

export const tysonsAttendeesById = new Map(tysonsAttendees.map((a) => [a.id, a]))
