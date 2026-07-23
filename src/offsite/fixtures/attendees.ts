import type { Attendee } from '../domain/types'
import { conference } from './conference'

type Seed = [
  id: string,
  name: string,
  title: string,
  company: string,
  interests: string[],
  sessionIds: string[],
  directoryOptIn?: boolean,
]

/**
 * Simulated roster (DESIGN.md #1). `directoryOptIn: false` attendees are the
 * ones who are counted but never named anywhere — keep a few so the privacy
 * model is visible in the demo rather than merely claimed (DESIGN.md #3).
 */
/**
 * Session and interest overlap with the viewer (a1) is deliberately spread so
 * every section of the grouped attending list is populated but none dominates
 * (DESIGN.md #16). For the opening reception that lands at roughly 3 session
 * matches, 5 interest matches, 1 colleague and 3 with no overlap.
 */
const seeds: Seed[] = [
  ['a1', 'Maya Okonkwo', 'Staff Engineer', 'Northwind', ['AI', 'DevTools'], ['s1', 's3']],
  ['a2', 'Dev Raman', 'Product Lead', 'Kestrel', ['AI', 'FinTech'], ['s1', 's4']],
  ['a3', 'Priya Nair', 'Design Director', 'Loomis', ['Design'], ['s7', 's8']],
  ['a4', 'Tomas Vega', 'Founder', 'Cadence', ['FinTech'], ['s4']],
  ['a5', 'Ana Belova', 'ML Engineer', 'Northwind', ['AI'], ['s3', 's9']],
  ['a6', 'Jules Marchetti', 'CTO', 'Fernweh', ['DevTools', 'AI'], ['s3', 's5']],
  ['a7', 'Sam Adeyemi', 'Data Scientist', 'Kestrel', ['AI', 'Climate'], ['s9']],
  ['a8', 'Rin Takahashi', 'Design Engineer', 'Loomis', ['Design', 'DevTools'], ['s2', 's7']],
  ['a9', 'Noor Hassan', 'VP Engineering', 'Sable', ['DevTools'], ['s5'], false],
  ['a10', 'Eli Brandt', 'Growth Lead', 'Cadence', ['FinTech'], ['s4', 's6']],
  ['a11', 'Kofi Mensah', 'Platform Engineer', 'Fernweh', ['DevTools'], ['s5', 's10']],
  ['a12', 'Sasha Petrova', 'Researcher', 'Verdant', ['Climate', 'AI'], ['s6', 's9']],
  ['a13', 'Marco Silva', 'Solutions Architect', 'Sable', ['FinTech', 'DevTools'], ['s4', 's10']],
  ['a14', 'Yuki Sato', 'Head of Design', 'Verdant', ['Design', 'Climate'], ['s2', 's6'], false],
  ['a15', 'Amara Diallo', 'Engineering Manager', 'Northwind', ['Design'], ['s2', 's8']],
  ['a16', 'Ben Kowalski', 'Developer Advocate', 'Kestrel', ['DevTools'], ['s10']],
  ['a17', 'Lucia Ferrari', 'Principal PM', 'Loomis', ['Design', 'AI'], ['s2', 's7']],
  ['a18', 'Omar Farouk', 'Security Lead', 'Sable', ['FinTech'], ['s10']],
  ['a19', 'Hana Kim', 'Climate Analyst', 'Verdant', ['Climate'], ['s6']],
  ['a20', 'Theo Lindqvist', 'Staff Designer', 'Fernweh', ['Design'], ['s2', 's7']],
]

export const attendees: Attendee[] = seeds.map(
  ([id, name, title, company, interests, sessionIds, directoryOptIn = true]) => ({
    id,
    conferenceId: conference.id,
    name,
    title,
    company,
    photoUrl: '',
    interests,
    sessionIds,
    directoryOptIn,
  }),
)

export const attendeesById = new Map(attendees.map((a) => [a.id, a]))

/** Personas offered in the demo switcher (DESIGN.md #11). */
export const demoPersonaIds = ['a1', 'a2', 'a6', 'a17'] as const
