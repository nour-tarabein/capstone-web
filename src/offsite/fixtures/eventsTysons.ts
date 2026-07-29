import type { OffsiteEvent } from '../domain/types'
import type { RawEvent } from '../ingestion/SourceAdapter'
import { tysonsConference } from './conference'
import { milesBetween } from '../ingestion/curate'

/**
 * Placeholder events for the Tysons Corner fixture — structurally identical to
 * fixtures/events.ts, but nobody real and no real venues beyond the
 * conference's own. One night only (tysonsConference.nights has a single
 * date), so there is no Thursday/Friday split to keep sparse. Exists so the
 * conference-scoped data prefactor has a second dataset to scope against in
 * tests; no screen reads this yet.
 */
const officialEvents: RawEvent[] = [
  {
    source: 'official',
    sourceEventId: 'tys-opening-reception',
    sourceUrl: '#',
    title: 'Tysons Opening Reception',
    description: 'Placeholder opening reception for the Tysons Corner conference.',
    startsAt: '2026-07-30T18:00:00-04:00',
    endsAt: '2026-07-30T21:00:00-04:00',
    venueName: '1765 Greensboro Station Pl - Lobby',
    lat: 38.9196,
    lng: -77.2264,
    tags: ['AI', 'FinTech', 'DevTools', 'Design', 'Climate'],
  },
]

const eventbriteEvents: RawEvent[] = [
  {
    source: 'eventbrite',
    sourceEventId: 'tys-eb-placeholder-mixer',
    externalGoingCount: 40,
    sourceUrl: 'https://www.eventbrite.com/e/placeholder-tysons-mixer',
    title: 'Placeholder Tysons Mixer',
    description: 'Placeholder third-party event for the Tysons Corner fixture.',
    startsAt: '2026-07-30T18:30:00-04:00',
    endsAt: '2026-07-30T21:00:00-04:00',
    venueName: 'Placeholder Venue A',
    lat: 38.9204,
    lng: -77.2277,
    tags: ['DevTools'],
  },
]

function approve(raw: RawEvent): OffsiteEvent {
  const distance = milesBetween(raw.lat, raw.lng, tysonsConference.venueLat, tysonsConference.venueLng)
  const matched = raw.tags.filter((t) => tysonsConference.topicTags.includes(t))
  const reasons = [
    matched.length ? `matches ${matched.join(', ')}` : 'no tag match',
    `${distance.toFixed(1)} mi from venue`,
  ]

  return {
    id: `${raw.source}:${raw.sourceEventId}`,
    conferenceId: tysonsConference.id,
    ...raw,
    isOfficial: raw.source === 'official',
    curationStatus: 'approved',
    curationRationale: reasons.join(' · '),
    submittedByAttendeeId: null,
  }
}

const hostedEvents: OffsiteEvent[] = [
  {
    ...approve({
      source: 'attendee',
      sourceEventId: 'tys-host-placeholder-meetup',
      sourceUrl: '',
      title: 'Placeholder Hosted Meetup',
      description: 'Placeholder attendee-hosted event for the Tysons Corner fixture.',
      startsAt: '2026-07-30T19:00:00-04:00',
      endsAt: '2026-07-30T21:00:00-04:00',
      venueName: 'Placeholder Venue B',
      lat: 38.919,
      lng: -77.2255,
      tags: ['AI'],
    }),
    curationRationale: 'Hosted by an attendee · approved by the organizer',
    submittedByAttendeeId: 't2',
  },
]

export const tysonsEvents: OffsiteEvent[] = [
  ...[...officialEvents, ...eventbriteEvents].map(approve),
  ...hostedEvents,
]

export const tysonsPendingSubmissions: OffsiteEvent[] = [
  {
    ...approve({
      source: 'attendee',
      sourceEventId: 'tys-sub-placeholder-walk',
      sourceUrl: '',
      title: 'Placeholder Sunrise Walk',
      description: 'Placeholder attendee submission awaiting review.',
      startsAt: '2026-07-30T07:00:00-04:00',
      endsAt: '2026-07-30T08:00:00-04:00',
      venueName: 'Placeholder Trailhead',
      lat: 38.9182,
      lng: -77.2249,
      tags: [],
    }),
    curationStatus: 'candidate',
    curationRationale: 'Submitted by an attendee',
    submittedByAttendeeId: 't4',
  },
]

export const tysonsRejectedCandidates: OffsiteEvent[] = [
  {
    ...approve({
      source: 'eventbrite',
      sourceEventId: 'tys-eb-rejected-placeholder',
      externalGoingCount: 12,
      sourceUrl: 'https://www.eventbrite.com/e/placeholder-rejected',
      title: 'Placeholder Rejected Run',
      description: 'Placeholder rejected candidate for the Tysons Corner fixture.',
      startsAt: '2026-07-30T07:30:00-04:00',
      endsAt: '2026-07-30T08:30:00-04:00',
      venueName: 'Placeholder Trail',
      lat: 38.9161,
      lng: -77.2231,
      tags: [],
    }),
    curationStatus: 'rejected',
    curationRationale: 'no tag match · morning slot · not a networking context',
  },
]
