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
  { id: 'keynote', title: 'Opening Keynote', day: '2026-09-15', time: '9:00 – 10:00 AM', room: 'Main Hall' },
  { id: 's1', title: sessionTitles.s1, day: '2026-09-15', time: '10:30 – 11:15 AM', room: 'Ballroom A', track: 'AI' },
  { id: 's3', title: sessionTitles.s3, day: '2026-09-15', time: '11:30 AM – 12:15 PM', room: 'Ballroom B', track: 'DevTools' },
  { id: 's4', title: sessionTitles.s4, day: '2026-09-15', time: '1:30 – 2:15 PM', room: 'Room 204', track: 'FinTech' },
  { id: 'reception', title: 'Summit Opening Reception', day: '2026-09-15', time: '6:00 – 9:00 PM', room: 'Terrace', official: true },
  { id: 's2', title: sessionTitles.s2, day: '2026-09-16', time: '9:30 – 10:15 AM', room: 'Ballroom B', track: 'Design' },
  { id: 's5', title: sessionTitles.s5, day: '2026-09-16', time: '10:30 – 11:15 AM', room: 'Ballroom A', track: 'DevTools' },
  { id: 's6', title: sessionTitles.s6, day: '2026-09-16', time: '11:30 AM – 12:15 PM', room: 'Room 204', track: 'Climate' },
  { id: 's7', title: sessionTitles.s7, day: '2026-09-16', time: '1:30 – 2:15 PM', room: 'Room 210', track: 'Design' },
  { id: 'happy-hour', title: 'Sponsor Happy Hour', day: '2026-09-16', time: '5:00 – 7:30 PM', room: 'Speakeasy', official: true },
  { id: 's8', title: sessionTitles.s8, day: '2026-09-17', time: '9:30 – 10:15 AM', room: 'Ballroom B', track: 'Design' },
  { id: 's9', title: sessionTitles.s9, day: '2026-09-17', time: '10:30 – 11:15 AM', room: 'Ballroom A', track: 'AI' },
  { id: 's10', title: sessionTitles.s10, day: '2026-09-17', time: '11:30 AM – 12:15 PM', room: 'Room 204', track: 'DevTools' },
  { id: 'closing-party', title: 'Closing Party', day: '2026-09-17', time: '8:00 PM – 12:00 AM', room: "Banger's", official: true },
];

export const exhibitorFilters = ['Sponsorship level', 'Booth section'];

export type Exhibitor = {
  id: string;
  name: string;
  booth: string;
  sponsorship?: string;
  section: string;
};

/** Fictional companies, matching the mocked attendee roster where possible
 *  (src/offsite/fixtures/attendees.ts) so the demo tells one story. */
export const exhibitors: Exhibitor[] = [
  { id: '1', name: 'Aurora Stagecraft', booth: 'E2', sponsorship: 'Platinum', section: 'A' },
  { id: '2', name: 'Cadence', booth: 'V13', sponsorship: 'Gold', section: 'C' },
  { id: '3', name: 'Fernweh', booth: 'S10', section: 'F' },
  { id: '4', name: 'Kestrel', booth: 'S9', section: 'K' },
  { id: '5', name: 'Loomis', booth: 'E16', section: 'L' },
  { id: '6', name: 'Northwind', booth: 'V15', section: 'N' },
  { id: '7', name: 'Sable', booth: 'E11', sponsorship: 'Silver', section: 'S' },
  { id: '8', name: 'Verdant', booth: 'V7', section: 'V' },
];

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

/** From the conference fixture, so the Location card cannot disagree with the
 *  map or the "x mi from venue" distances. */
export const eventLocation = {
  name: conference.venueName,
};
