import type { Attendee } from '../domain/types'
import { conference } from './conference'

type Seed = [
  id: string,
  name: string,
  title: string,
  /** Department — stored in `company` so attending-list “same company” groups by dept. */
  department: string,
  interests: string[],
  sessionIds: string[],
]

/**
 * Cvent intern/exec roster for the live demo. Abhinav (a47) is the default
 * persona. `company` holds department so relevance grouping still works when
 * everyone is actually at Cvent.
 *
 * Interests and sessions are derived from department so the reciprocity-gated
 * attending list still shows session / interest / department sections.
 */
const seeds: Seed[] = [
  // Executive leadership
  ['a1', 'Reggie Aggarwal', 'CEO', 'Finance', ['FinTech', 'AI'], ['s1', 's4']],
  ['a2', 'David Quattrone', 'Chief Technology Officer', 'Technology', ['AI', 'DevTools'], ['s1', 's3']],
  ['a3', 'Amy Lucia', 'SVP and Chief Marketing Officer', 'Marketing', ['Design'], ['s2', 's7']],
  ['a4', 'Andreas Heckmann', 'Chief Customer Officer', 'Client Services', ['Design', 'FinTech'], ['s2', 's8']],
  ['a5', 'Kathy Wagner', 'Senior Vice President, Chief Financial Officer', 'Finance', ['FinTech'], ['s4']],
  ['a6', 'Pradeep Mannakkara', 'Senior Vice President and Chief Information Officer', 'Information Technology', ['DevTools', 'AI'], ['s5', 's10']],
  ['a7', 'Ben Mayrides', 'Vice President and Chief Information Security Officer', 'Information Technology', ['DevTools'], ['s10']],
  ['a8', 'Chuck Ghoorah', 'President of Worldwide Sales and Marketing', 'Sales', ['FinTech', 'Design'], ['s4', 's6']],

  // Interns — Client Services
  ['a9', 'Alexa Norris', 'Client Services Intern', 'Client Services', ['Design'], ['s8']],
  ['a10', 'Danielle Faerberg', 'Client Services Intern', 'Client Services', ['Design'], ['s2']],
  ['a11', 'Erin Earley', 'Client Services Intern', 'Client Services', ['Design', 'FinTech'], ['s8']],
  ['a12', 'Giselle Harvey', 'Client Services Intern', 'Client Services', ['Design'], ['s2', 's8']],
  ['a13', 'Kat Willey', 'Client Services Intern', 'Client Services', ['Design'], ['s7']],

  // Interns — Finance
  ['a14', 'Nathan Quattrone', 'Corporate Development Intern', 'Finance', ['FinTech'], ['s4', 's6']],

  // Interns — Information Technology
  ['a15', 'Ismael Anwarzai', 'Sales Engineering Intern', 'Information Technology', ['DevTools', 'FinTech'], ['s5', 's10']],
  ['a16', 'Nour Tarbin', 'Cloud Infrastructure Intern', 'Information Technology', ['DevTools', 'AI'], ['s5', 's3']],
  ['a17', 'Praveen Babu', 'IT Financials Systems Intern', 'Information Technology', ['DevTools', 'FinTech'], ['s10', 's4']],
  ['a18', 'Tala Shihadeh', 'Security Risk & Compliance Intern', 'Information Technology', ['DevTools'], ['s10']],

  // Interns — Marketing
  ['a19', 'Kaylen Ko', 'Meetings and Events Intern', 'Marketing', ['Design'], ['s2', 's6']],

  // Interns — Sales
  ['a20', 'Abby Jones', 'Sales Intern', 'Sales', ['FinTech'], ['s4']],
  ['a21', 'Braden Fitzpatrick', 'Sales Intern', 'Sales', ['FinTech'], ['s6']],
  ['a22', 'Carlix Lee', 'Sales Intern', 'Sales', ['FinTech', 'Design'], ['s4']],
  ['a23', 'Charlotte Rizzi', 'Sales Intern', 'Sales', ['FinTech'], ['s4', 's6']],
  ['a24', 'Clara Fernandez', 'Sales Intern', 'Sales', ['FinTech'], ['s6']],
  ['a25', 'Eddie Largent', 'Sales Intern', 'Sales', ['FinTech'], ['s4']],
  ['a26', 'Ellee Groves', 'Sales Intern', 'Sales', ['FinTech', 'Design'], ['s6']],
  ['a27', 'Fidel Small', 'Sales Intern', 'Sales', ['FinTech'], ['s4']],
  ['a28', 'Grace Lintz', 'Sales Intern', 'Sales', ['FinTech'], ['s6']],
  ['a29', 'Graciela Dominguez', 'Sales Intern', 'Sales', ['FinTech'], ['s4']],
  ['a30', 'Jenna Corcoran', 'Sales Intern', 'Sales', ['FinTech'], ['s6']],
  ['a31', 'Julianna Schray', 'Sales Intern', 'Sales', ['FinTech', 'Design'], ['s4']],
  ['a32', 'Kyle Ables', 'Sales Intern', 'Sales', ['FinTech'], ['s6']],
  ['a33', 'Liam O’Driscoll', 'Sales Intern', 'Sales', ['FinTech'], ['s4']],
  ['a34', 'Luca Marques', 'Sales Intern', 'Sales', ['FinTech'], ['s6']],
  ['a35', 'Morgan Doyle', 'Sales Intern', 'Sales', ['FinTech'], ['s4']],
  ['a36', 'Nate Murphy', 'Sales Intern', 'Sales', ['FinTech'], ['s6']],
  ['a37', 'Nick Apostolou', 'Sales Intern', 'Sales', ['FinTech'], ['s4']],
  ['a38', 'Nickawn Pouryoussefi', 'Sales Intern', 'Sales', ['FinTech'], ['s6']],
  ['a39', 'Rohan Agarwal', 'Sales Intern', 'Sales', ['FinTech', 'AI'], ['s1', 's4']],
  ['a40', 'Ryann Harrington', 'Sales Intern', 'Sales', ['FinTech'], ['s6']],
  ['a41', 'Salem Eshete', 'Sales Intern', 'Sales', ['FinTech'], ['s4']],
  ['a42', 'Taylor Chase', 'Sales Intern', 'Sales', ['FinTech'], ['s6']],
  ['a43', 'Tyler Rogers', 'Sales Intern', 'Sales', ['FinTech'], ['s4']],
  ['a44', 'Wyatt King', 'Sales Intern', 'Sales', ['FinTech'], ['s6']],

  // Interns — Technology
  ['a45', 'Aarnav Kapoor', 'Software Engineer Intern', 'Technology', ['AI', 'DevTools'], ['s1', 's3']],
  ['a46', 'Aaron Perrotta', 'Software Engineer Intern', 'Technology', ['DevTools'], ['s3', 's5']],
  ['a47', 'Abhinav Pappu', 'Software Engineer Intern', 'Technology', ['AI', 'DevTools'], ['s1', 's5']],
  ['a48', 'Andrea Valladares', 'Technology Operations Intern', 'Technology', ['DevTools'], ['s5', 's10']],
  ['a49', 'Areeb Khan', 'SDET Intern', 'Technology', ['DevTools'], ['s5']],
  ['a50', 'Brio Schwinden', 'Software Engineer Intern', 'Technology', ['AI', 'DevTools'], ['s3', 's9']],
  ['a51', 'Evan Cantwell', 'Software Engineer Intern', 'Technology', ['DevTools'], ['s3', 's5']],
  ['a52', 'Issa Kabore', 'Software Engineer Intern', 'Technology', ['AI'], ['s1', 's9']],
  ['a53', 'Jack Johnson', 'Software Engineer Intern', 'Technology', ['DevTools', 'AI'], ['s3', 's10']],
  ['a54', 'Jake Keller', 'Data Science Intern', 'Technology', ['AI'], ['s3', 's9']],
  ['a55', 'Joshua Johnson', 'Software Engineer Intern', 'Technology', ['DevTools'], ['s5']],
  ['a56', 'Mahnoor Najeeb', 'Scrum Master Intern', 'Technology', ['DevTools', 'Design'], ['s5', 's2']],
  ['a57', 'Paige Reeves', 'Product Design Intern', 'Technology', ['Design'], ['s2', 's7']],
  ['a58', 'Pranav Elavarthi', 'Software Engineering Intern', 'Technology', ['AI', 'DevTools'], ['s1', 's3']],
  ['a59', 'Pratik Shrestha', 'Software Engineering Intern', 'Technology', ['DevTools'], ['s5', 's10']],
  ['a60', 'Quinn Savitt', 'Software Engineer Intern', 'Technology', ['AI', 'DevTools'], ['s3', 's9']],
  ['a61', 'Sherry Chen', 'Product Design Intern', 'Technology', ['Design'], ['s2', 's7']],
  ['a62', 'Shritan Goki', 'Software Engineering Intern', 'Technology', ['DevTools', 'AI'], ['s1', 's5']],
  ['a63', 'Zaylie Tamashiro', 'Software Engineering Intern', 'Technology', ['DevTools'], ['s3', 's5']],
]

export const attendees: Attendee[] = seeds.map(
  ([id, name, title, department, interests, sessionIds]) => ({
    id,
    conferenceId: conference.id,
    name,
    title,
    company: department,
    photoUrl: '',
    interests,
    sessionIds,
    directoryOptIn: true,
  }),
)

export const attendeesById = new Map(attendees.map((a) => [a.id, a]))

/**
 * Curated quick-switch subset (profile “View as” + any compact UI). The More
 * screen lists the full roster.
 */
export const demoPersonaIds = ['a1', 'a2', 'a3', 'a8', 'a47', 'a57'] as const
