import {
  mdiAccountGroupOutline,
  mdiAccountTie,
  mdiAccountVoice,
  mdiCalendarMonthOutline,
  mdiHandCoinOutline,
  mdiMedalOutline,
  mdiMessageTextOutline,
  mdiPlayCircleOutline,
  mdiStarCircleOutline,
  mdiStorefrontOutline,
  mdiTrophyOutline,
  mdiWifi,
} from '@mdi/js';
import { conference, nightLabels } from '../offsite/fixtures/conference';
import { sessionTitles } from '../offsite/fixtures/sessions';

export const homeActions = [
  { id: 'speakers', label: 'Speakers', icon: mdiAccountTie },
  { id: 'attendees', label: 'Attendees', icon: mdiAccountGroupOutline },
  { id: 'onDemand', label: 'On Demand', icon: mdiPlayCircleOutline },
  { id: 'exhibitors', label: 'Exhibitors', icon: mdiStorefrontOutline },
  { id: 'sponsors', label: 'Sponsors', icon: mdiStarCircleOutline },
  { id: 'games', label: 'Games', icon: mdiTrophyOutline },
];

export const scheduleCategories = ['All Sessions', ...conference.topicTags];

export const scheduleTabs = ['Session Guide', 'My Schedule', 'Recommended'] as const;

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Day picker entries, derived from the conference nights so the schedule
 *  cannot disagree with the offsite map about when the summit runs. */
export const scheduleDays = conference.nights.map((night) => {
  const [, month, day] = night.split('-');
  return {
    night,
    label: `${nightLabels[night]} ${monthNames[Number(month) - 1]} ${Number(day)}`,
  };
});

export type ScheduleSession = {
  /** Matches attendee sessionIds (s1–s10) where the session is in the
   *  offsite catalogue, so My Schedule can be driven by the persona. */
  id: string;
  title: string;
  day: string;
  time: string;
  room: string;
  track?: string;
  official?: boolean;
};

/** Session titles come from the offsite catalogue and the official evening
 *  events mirror the approved slate in fixtures/events.ts, so the guide and
 *  the map tell one story. */
export const sessionGuide: ScheduleSession[] = [
  // Day 1 (Thu). The afternoon after 2:15 is deliberately empty: that free
  // block is the gap the My Event timeline offers to fill with the map.
  { id: 'keynote', title: 'Opening Keynote', day: '2026-07-30', time: '9:00 – 10:00 AM', room: 'Main Hall' },
  { id: 's1', title: sessionTitles.s1, day: '2026-07-30', time: '10:30 – 11:15 AM', room: 'Ballroom A', track: 'AI' },
  { id: 's3', title: sessionTitles.s3, day: '2026-07-30', time: '11:30 AM – 12:15 PM', room: 'Ballroom B', track: 'DevTools' },
  { id: 's4', title: sessionTitles.s4, day: '2026-07-30', time: '1:30 – 2:15 PM', room: 'Room 204', track: 'FinTech' },
  { id: 'reception', title: 'Summit Opening Reception', day: '2026-07-30', time: '6:00 – 9:00 PM', room: 'Terrace', official: true },
  // Day 2 (Fri). Carries the remaining tracks, since there is no third day.
  { id: 's2', title: sessionTitles.s2, day: '2026-07-31', time: '9:30 – 10:15 AM', room: 'Ballroom B', track: 'Design' },
  { id: 's5', title: sessionTitles.s5, day: '2026-07-31', time: '10:30 – 11:15 AM', room: 'Ballroom A', track: 'DevTools' },
  { id: 's6', title: sessionTitles.s6, day: '2026-07-31', time: '11:30 AM – 12:15 PM', room: 'Room 204', track: 'Climate' },
  { id: 's7', title: sessionTitles.s7, day: '2026-07-31', time: '1:30 – 2:15 PM', room: 'Room 210', track: 'Design' },
  { id: 's8', title: sessionTitles.s8, day: '2026-07-31', time: '2:30 – 3:15 PM', room: 'Ballroom B', track: 'Design' },
  { id: 's9', title: sessionTitles.s9, day: '2026-07-31', time: '3:30 – 4:15 PM', room: 'Ballroom A', track: 'AI' },
  { id: 's10', title: sessionTitles.s10, day: '2026-07-31', time: '4:30 – 5:15 PM', room: 'Room 204', track: 'DevTools' },
  { id: 'closing-party', title: 'Closing Party', day: '2026-07-31', time: '8:00 PM – 12:00 AM', room: "Banger's", official: true },
];

/** One speaker per session. Companies come from the exhibitor list so the
 *  speakers, booths, and attendee roster describe one consistent world. */
export type Speaker = {
  sessionId: string;
  name: string;
  title: string;
  company: string;
};

export const speakers: Speaker[] = [
  { sessionId: 'keynote', name: 'Imani Cole', title: 'CEO', company: 'Aurora Stagecraft' },
  { sessionId: 's1', name: 'Wes Tanaka', title: 'VP of AI Infrastructure', company: 'Northwind' },
  { sessionId: 's2', name: 'Freya Lindholm', title: 'Design Systems Lead', company: 'Loomis' },
  { sessionId: 's3', name: 'Andre Boateng', title: 'Head of Developer Experience', company: 'Fernweh' },
  { sessionId: 's4', name: 'Carmen Ruiz', title: 'Payments Architect', company: 'Cadence' },
  { sessionId: 's5', name: 'Ollie Hart', title: 'Principal Engineer', company: 'Sable' },
  { sessionId: 's6', name: 'Dr. Lena Voss', title: 'Chief Scientist', company: 'Verdant' },
  { sessionId: 's7', name: 'Mira Chandra', title: 'Research Lead', company: 'Loomis' },
  { sessionId: 's8', name: 'Jonas Weber', title: 'Accessibility Lead', company: 'Kestrel' },
  { sessionId: 's9', name: 'Tessa Marino', title: 'ML Platform Lead', company: 'Northwind' },
  { sessionId: 's10', name: 'Ray Okafor', title: 'SRE Manager', company: 'Sable' },
];

export const speakersBySession = new Map(speakers.map((s) => [s.sessionId, s]));

/** Blurbs for the session detail sheet. */
export const sessionDescriptions: Record<string, string> = {
  keynote:
    'Imani Cole opens the summit with where the Texas tech scene is heading — and three product reveals from the main stage.',
  s1: 'Serving models without a blank-check GPU budget: quantization, batching, and the caching tricks that actually survive production.',
  s2: 'How a design system earns its keep between seed and Series B — and the parts you should refuse to build too early.',
  s3: 'Why internal tooling keeps losing to the tools your engineers download themselves, and how to close the gap.',
  s4: 'Instant payments, stablecoin rails, and what 2026 regulation means for anyone moving money in the US.',
  s5: 'Platform engineering practices for teams too small to staff a platform team.',
  s6: 'Public climate datasets are a mess. Here is how to build products on them anyway.',
  s7: 'A working research practice for teams of one or two — cadence, tooling, and stakeholder buy-in.',
  s8: 'Shipping accessible by default: the audit that becomes a habit instead of a quarterly scramble.',
  s9: 'Evals that predict user-visible quality, and the ones that only predict your leaderboard.',
  s10: 'Incident response that protects the humans running it: rotations, handoffs, and blameless reviews that stay blameless.',
};

/** My Event updates. The first `unreadUpdateCount` are the fresh ones. */
export const updates = [
  {
    id: 'u1',
    title: 'Kick off the week!',
    body: 'Summit Opening Reception starts at 6:00 PM! Head to the Terrace for great vibes, new connections, and local bites.',
    time: '2:05 PM',
  },
  {
    id: 'u2',
    title: 'Room change',
    body: 'Payments Infrastructure in 2026 has moved from Room 204 to Ballroom B. Your schedule is already updated.',
    time: '11:40 AM',
  },
  {
    id: 'u3',
    title: 'Badge pickup is open',
    body: 'Registration desk is open until 7:00 PM on Level 1 — grab your badge before the reception.',
    time: 'Yesterday',
  },
];

export const unreadUpdateCount = 2;

/** Activity feed posts, authored by people from the attendee roster. */
export const activityFeed = [
  {
    id: 'f1',
    author: 'Abhinav Pappu',
    time: '1h',
    text: 'That keynote demo was unreal. Who else is headed to Scaling Inference on a Budget at 10:30?',
    likes: 12,
  },
  {
    id: 'f2',
    author: 'Chuck Ghoorah',
    time: '2h',
    text: 'Booth V13 has cold brew. You’re welcome.',
    likes: 31,
  },
  {
    id: 'f3',
    author: 'Paige Reeves',
    time: '3h',
    text: 'Design folks — Research Ops for Small Teams, tomorrow 9:30 in Room 210. Come say hi.',
    likes: 18,
  },
  {
    id: 'f4',
    author: 'David Quattrone',
    time: '4h',
    text: 'Dropped a stack of holographic stickers at the Technology lounge. First come first served.',
    likes: 9,
  },
];

/** Game Center: challenges the viewer can complete live, plus a leaderboard. */
export const gameChallenges = [
  { id: 'g1', label: 'Visit 3 exhibitor booths', points: 150 },
  { id: 'g2', label: 'Scan a fellow attendee’s badge', points: 100 },
  { id: 'g3', label: 'Go to an off-site event tonight', points: 200 },
  { id: 'g4', label: 'Rate a session in the app', points: 50 },
];

export const gameLeaderboard = [
  { name: 'Abhinav Pappu', points: 1240 },
  { name: 'Paige Reeves', points: 1105 },
  { name: 'Rohan Agarwal', points: 980 },
  { name: 'Sherry Chen', points: 795 },
  { name: 'Jake Keller', points: 760 },
];

export const wifiInfo = { ssid: 'LonestarSummit', password: 'howdy-2026' };

export const exhibitorFilters = ['Sponsorship level', 'Booth section'];

export type Exhibitor = {
  id: string;
  name: string;
  booth: string;
  sponsorship?: string;
  section: string;
  blurb: string;
};

/** Fictional companies, matching the mocked attendee roster where possible
 *  (src/offsite/fixtures/attendees.ts) so the demo tells one story. */
export const exhibitors: Exhibitor[] = [
  { id: '1', name: 'Aurora Stagecraft', booth: 'E2', sponsorship: 'Platinum', section: 'A', blurb: 'Event production and staging for live tech launches — the team behind this year’s main stage.' },
  { id: '2', name: 'Cadence', booth: 'V13', sponsorship: 'Gold', section: 'C', blurb: 'Payments infrastructure for marketplaces. Ask for a demo of instant payouts (and the cold brew).' },
  { id: '3', name: 'Fernweh', booth: 'S10', section: 'F', blurb: 'Developer-experience tooling that meets your engineers where they already work.' },
  { id: '4', name: 'Kestrel', booth: 'S9', section: 'K', blurb: 'Data platform for product teams. Sticker drop at the booth all week.' },
  { id: '5', name: 'Loomis', booth: 'E16', section: 'L', blurb: 'Design ops and research tooling for small, fast teams.' },
  { id: '6', name: 'Northwind', booth: 'V15', section: 'N', blurb: 'ML infrastructure that scales down as gracefully as it scales up.' },
  { id: '7', name: 'Sable', booth: 'E11', sponsorship: 'Silver', section: 'S', blurb: 'Security and reliability tooling for fintech workloads.' },
  { id: '8', name: 'Verdant', booth: 'V7', section: 'V', blurb: 'Climate datasets, cleaned and versioned, with an API your team will actually use.' },
];

export const exhibitorsById = new Map(exhibitors.map((e) => [e.id, e]));

export const moreMenuItems = [
  { id: 'attendees', label: 'Attendees', icon: mdiAccountVoice },
  { id: 'activity', label: 'Activity Feed', icon: mdiMessageTextOutline },
  { id: 'sponsors', label: 'Sponsors', icon: mdiHandCoinOutline },
  { id: 'speakers', label: 'Speakers', icon: mdiAccountTie },
  { id: 'onDemand', label: 'On Demand', icon: mdiPlayCircleOutline },
  { id: 'games', label: 'Game Center', icon: mdiTrophyOutline },
];

export const moreGeneralItems = [
  { id: 'wifi', label: 'Conference WiFi', icon: mdiWifi },
  {
    id: 'agenda',
    label: 'Agenda at a Glance, Reg Desk Hours,...',
    icon: mdiCalendarMonthOutline,
  },
];

export const moreInviteOnlyItems = [
  { id: 'awards', label: 'Excellence Awards', icon: mdiMedalOutline },
];
