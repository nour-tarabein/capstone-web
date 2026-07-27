import type { EventSource } from './domain/types';
import eventbriteIcon from '../assets/sources/eventbrite.png';
import lumaIcon from '../assets/sources/luma.png';
import partifulIcon from '../assets/sources/partiful.png';
import shotgunIcon from '../assets/sources/shotgun.png';

/**
 * Formats an event time in the CONFERENCE's timezone, not the device's.
 *
 * Two traps here, both hit during the port:
 *  - `new Date(iso).getHours()` renders in device time, so demoing an Austin
 *    event from Eastern showed everything an hour late.
 *  - Reading the wall clock straight off the string works for fixtures
 *    ("...T17:30:00-05:00") but not for Supabase, where starts_at is a
 *    timestamptz and PostgREST returns it normalised to UTC ("...T22:30:00Z").
 *    That read 5 hours late.
 *
 * So: convert explicitly. Hermes can ship without full ICU and then silently
 * ignores `timeZone` rather than throwing, so we verify against a known
 * instant once at load and fall back to a fixed offset if it lied.
 */
const CONFERENCE_ZONE = 'America/Chicago';
/** Austin is UTC-5 (CDT) during the conference dates. */
const FALLBACK_OFFSET_MINUTES = -300;

const intlHonoursTimeZone = (() => {
  try {
    // 2026-09-15T22:30Z is 5:30 PM in Chicago.
    const probe = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: CONFERENCE_ZONE,
    }).format(new Date('2026-09-15T22:30:00Z'));
    return probe.startsWith('5:30');
  } catch {
    return false;
  }
})();

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  if (intlHonoursTimeZone) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: CONFERENCE_ZONE,
    }).format(date);
  }

  const shifted = new Date(date.getTime() + FALLBACK_OFFSET_MINUTES * 60_000);
  const hours24 = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes().toString().padStart(2, '0');
  const period = hours24 >= 12 ? 'PM' : 'AM';
  return `${hours24 % 12 || 12}:${minutes} ${period}`;
}

/**
 * Builds a `starts_at` in the conference's timezone from a night and a wall
 * clock time, e.g. ('2026-09-16', '19:30') → '2026-09-16T19:30:00-05:00'.
 *
 * The offset is written explicitly rather than letting `new Date()` infer one,
 * because inferring it is exactly the bug documented above: a submission made
 * from an Eastern-timezone phone would otherwise land an hour off in Postgres.
 * Same -05:00 as FALLBACK_OFFSET_MINUTES, and the same shape the fixtures use.
 */
export function conferenceIso(night: string, wallClock: string): string {
  const sign = FALLBACK_OFFSET_MINUTES < 0 ? '-' : '+';
  const abs = Math.abs(FALLBACK_OFFSET_MINUTES);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${night}T${wallClock}:00${sign}${hh}:${mm}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
}

export const sourceLabels: Record<EventSource, string> = {
  official: 'Official',
  eventbrite: 'Eventbrite',
  luma: 'Luma',
  partiful: 'Partiful',
  shotgun: 'Shotgun',
  attendee: 'Attendee',
};

/**
 * Map-pin colours, sampled from each platform's own icon where it has a
 * chroma to sample. Luma and Partiful ship monochrome marks, so those are
 * chosen for separation instead: five sources have to stay tellable apart at
 * 15px on a dark basemap, which matters more than brand fidelity on a dot.
 */
export const sourceColors: Record<EventSource, string> = {
  official: '#00E676', // brand green
  eventbrite: '#FF5E30', // sampled from the icon
  shotgun: '#8175EA', // sampled from the icon gradient
  partiful: '#FF7AC6',
  luma: '#E6E8EC', // its mark is black-on-white; a light dot reads as that
  attendee: '#4CC9F0', // no brand to sample — picked for separation from the other five
};

/** Pins whose fill is light enough to need dark text for the count. */
export const sourceNeedsDarkText: Record<EventSource, boolean> = {
  official: true,
  eventbrite: false,
  shotgun: false,
  partiful: true,
  luma: true,
  attendee: true,
};

/** Platform marks. `official` has none — it is the conference's own event. */
export const sourceIcons: Partial<Record<EventSource, string>> = {
  eventbrite: eventbriteIcon,
  luma: lumaIcon,
  partiful: partifulIcon,
  shotgun: shotgunIcon,
};
