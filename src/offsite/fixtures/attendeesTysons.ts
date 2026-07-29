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
 * Real-world CEO roster for the Tysons Corner fixture, seeded per issue #8 —
 * a mix of tech CEOs and other Fortune 500 CEOs, recognizable by name, so the
 * conference-scoped roster has real density instead of a handful of
 * placeholders. Titles and companies are current public information; the
 * "attending this conference" framing is fictional demo data, same as every
 * other fixture in this repo.
 *
 * t1/t2/t3/t5 are RSVP'd (t5 anonymously) to the opening reception in
 * rsvpsTysons.ts — do not change those four ids. t4 is deliberately kept off
 * that RSVP list (mockRepository.test.ts uses it as the "viewer without
 * RSVPs" fixture).
 */
const seeds: Seed[] = [
  // Big Tech
  ['t1', 'Tim Cook', 'CEO', 'Apple', ['AI', 'DevTools'], ['s1', 's9']],
  ['t2', 'Satya Nadella', 'CEO', 'Microsoft', ['AI', 'DevTools'], ['s1', 's5']],
  ['t3', 'Sundar Pichai', 'CEO', 'Alphabet', ['AI', 'DevTools'], ['s1', 's9']],
  ['t4', 'Andy Jassy', 'CEO', 'Amazon', ['DevTools', 'AI'], ['s5', 's10']],
  ['t5', 'Mark Zuckerberg', 'CEO', 'Meta', ['AI', 'Design'], ['s9', 's2']],
  ['t6', 'Jensen Huang', 'CEO', 'NVIDIA', ['AI', 'DevTools'], ['s1', 's9']],
  ['t7', 'Elon Musk', 'CEO', 'Tesla', ['AI', 'Climate'], ['s9', 's6']],
  ['t8', 'Sam Altman', 'CEO', 'OpenAI', ['AI'], ['s9', 's1']],
  ['t9', 'Marc Benioff', 'CEO', 'Salesforce', ['AI', 'DevTools'], ['s3', 's5']],
  ['t10', 'Arvind Krishna', 'CEO', 'IBM', ['AI', 'DevTools'], ['s5', 's10']],
  ['t11', 'Shantanu Narayen', 'CEO', 'Adobe', ['Design', 'AI'], ['s2', 's7']],
  ['t12', 'Safra Catz', 'CEO', 'Oracle', ['FinTech', 'DevTools'], ['s4', 's5']],
  ['t13', 'Lisa Su', 'CEO', 'AMD', ['AI', 'DevTools'], ['s1', 's3']],
  ['t14', 'Dara Khosrowshahi', 'CEO', 'Uber', ['AI', 'DevTools'], ['s5', 's10']],
  ['t15', 'Brian Chesky', 'CEO', 'Airbnb', ['Design', 'AI'], ['s2', 's7']],
  ['t16', 'Evan Spiegel', 'CEO', 'Snap', ['Design', 'AI'], ['s2', 's9']],
  ['t17', 'Daniel Ek', 'CEO', 'Spotify', ['AI', 'Design'], ['s9', 's2']],
  ['t18', 'Melanie Perkins', 'CEO', 'Canva', ['Design'], ['s2', 's7']],
  ['t19', 'Tim Sweeney', 'CEO', 'Epic Games', ['DevTools', 'AI'], ['s3', 's9']],
  ['t20', 'Michael Dell', 'Chairman and CEO', 'Dell Technologies', ['DevTools', 'AI'], ['s5', 's10']],

  // Media & entertainment
  ['t21', 'Ted Sarandos', 'Co-CEO', 'Netflix', ['Design'], ['s2', 's7']],
  ['t22', 'Bob Iger', 'CEO', 'The Walt Disney Company', ['Design'], ['s2', 's7']],
  ['t23', 'David Zaslav', 'CEO', 'Warner Bros. Discovery', ['Design'], ['s7', 's2']],

  // Automotive
  ['t24', 'Mary Barra', 'Chair and CEO', 'General Motors', ['Climate', 'DevTools'], ['s6', 's5']],
  ['t25', 'Jim Farley', 'CEO', 'Ford Motor Company', ['Climate', 'DevTools'], ['s6', 's5']],

  // Finance
  ['t26', 'Jamie Dimon', 'Chairman and CEO', 'JPMorgan Chase', ['FinTech'], ['s4', 's10']],
  ['t27', 'Jane Fraser', 'CEO', 'Citigroup', ['FinTech'], ['s4']],
  ['t28', 'Brian Moynihan', 'Chairman and CEO', 'Bank of America', ['FinTech'], ['s4']],
  ['t29', 'David Solomon', 'Chairman and CEO', 'Goldman Sachs', ['FinTech'], ['s4', 's9']],
  ['t30', 'Charlie Scharf', 'CEO', 'Wells Fargo', ['FinTech'], ['s4']],
  ['t31', 'Larry Fink', 'Chairman and CEO', 'BlackRock', ['FinTech', 'Climate'], ['s4', 's6']],
  ['t32', 'Warren Buffett', 'CEO', 'Berkshire Hathaway', ['FinTech'], ['s4']],

  // Retail
  ['t33', 'Doug McMillon', 'President and CEO', 'Walmart', ['DevTools', 'FinTech'], ['s5', 's4']],
  ['t34', 'Brian Cornell', 'Chair and CEO', 'Target', ['Design', 'FinTech'], ['s2', 's4']],
  ['t35', 'Corie Barry', 'CEO', 'Best Buy', ['DevTools', 'Design'], ['s3', 's2']],
  ['t36', 'Marvin Ellison', 'Chairman and CEO', "Lowe's", ['DevTools'], ['s5']],
  ['t37', 'Ted Decker', 'Chair and CEO', 'The Home Depot', ['DevTools'], ['s5', 's3']],

  // Energy
  ['t38', 'Darren Woods', 'Chairman and CEO', 'ExxonMobil', ['Climate'], ['s6']],
  ['t39', 'Mike Wirth', 'Chairman and CEO', 'Chevron', ['Climate'], ['s6']],
  ['t40', 'Vicki Hollub', 'President and CEO', 'Occidental Petroleum', ['Climate'], ['s6', 's9']],

  // Healthcare & pharma
  ['t41', 'Albert Bourla', 'Chairman and CEO', 'Pfizer', ['AI', 'FinTech'], ['s9', 's4']],
  ['t42', 'David Ricks', 'Chairman and CEO', 'Eli Lilly and Company', ['AI', 'FinTech'], ['s9', 's4']],
  ['t43', 'Joaquin Duato', 'Chairman and CEO', 'Johnson & Johnson', ['AI', 'Design'], ['s9', 's2']],
  ['t44', 'Karen Lynch', 'President and CEO', 'CVS Health', ['FinTech', 'AI'], ['s4', 's9']],
  ['t45', 'Andrew Witty', 'CEO', 'UnitedHealth Group', ['FinTech', 'AI'], ['s4', 's10']],

  // Consumer & food
  ['t46', 'James Quincey', 'Chairman and CEO', 'The Coca-Cola Company', ['Design', 'Climate'], ['s2', 's6']],
  ['t47', 'Ramon Laguarta', 'Chairman and CEO', 'PepsiCo', ['Design', 'Climate'], ['s2', 's6']],
  ['t48', 'Brian Niccol', 'Chairman and CEO', 'Starbucks', ['Design'], ['s2', 's7']],
  ['t49', 'Chris Kempczinski', 'Chairman and CEO', "McDonald's", ['Design', 'DevTools'], ['s2', 's3']],

  // Aerospace & defense
  ['t50', 'Kelly Ortberg', 'President and CEO', 'Boeing', ['DevTools', 'AI'], ['s5', 's9']],
  ['t51', 'Jim Taiclet', 'Chairman and CEO', 'Lockheed Martin', ['AI', 'DevTools'], ['s9', 's5']],

  // Telecom
  ['t52', 'Hans Vestberg', 'Chairman and CEO', 'Verizon', ['DevTools', 'AI'], ['s3', 's9']],
  ['t53', 'John Stankey', 'Chairman and CEO', 'AT&T', ['DevTools'], ['s3', 's10']],

  // Airlines
  ['t54', 'Ed Bastian', 'CEO', 'Delta Air Lines', ['Climate', 'Design'], ['s6', 's2']],
  ['t55', 'Scott Kirby', 'CEO', 'United Airlines', ['Climate', 'DevTools'], ['s6', 's5']],
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
