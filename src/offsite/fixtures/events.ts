import type { OffsiteEvent } from '../domain/types'
import type { RawEvent } from '../ingestion/SourceAdapter'
import { conference } from './conference'
import { handCollectedEvents } from './handCollected'
import { milesBetween } from '../ingestion/curate'

/**
 * The approved nightly slate — what actually reaches the map.
 *
 * Official conference events come first and carry pre-existing RSVPs, because
 * the event platform already holds those registration lists. That is what keeps the map
 * non-empty on night one (DESIGN.md #8) and it is the part a standalone
 * startup structurally cannot replicate.
 */
const officialEvents: RawEvent[] = [
  {
    source: 'official',
    sourceEventId: 'lts-opening-reception',
    sourceUrl: '#',
    title: 'Summit Opening Reception',
    description: 'Drinks and small plates on the terrace. Badge required.',
    startsAt: '2026-09-15T18:00:00-05:00',
    endsAt: '2026-09-15T21:00:00-05:00',
    venueName: 'Austin Convention Center — Terrace',
    lat: 30.2637,
    lng: -97.7397,
    tags: ['AI', 'FinTech', 'DevTools', 'Design', 'Climate'],
  },
  {
    source: 'official',
    sourceEventId: 'lts-sponsor-hh',
    sourceUrl: '#',
    title: 'Sponsor Happy Hour',
    description: 'Hosted by our platinum sponsors. Open to all badge holders.',
    startsAt: '2026-09-16T17:00:00-05:00',
    endsAt: '2026-09-16T19:30:00-05:00',
    venueName: 'Speakeasy',
    lat: 30.2673,
    lng: -97.7423,
    tags: ['FinTech', 'DevTools'],
  },
  {
    source: 'official',
    sourceEventId: 'lts-closing-party',
    sourceUrl: '#',
    title: 'Closing Party',
    description: 'Rainey Street. Live music, tacos, and the last chance to swap numbers.',
    startsAt: '2026-09-17T20:00:00-05:00',
    endsAt: '2026-09-17T23:59:00-05:00',
    venueName: "Banger's",
    lat: 30.2551,
    lng: -97.7379,
    tags: ['AI', 'FinTech', 'DevTools', 'Design', 'Climate'],
  },
]

/** Pulled live from the Eventbrite API for tracked venues (DESIGN.md #14). */
const eventbriteEvents: RawEvent[] = [
  {
    source: 'eventbrite',
    sourceEventId: 'eb-startup-crawl',
    sourceUrl: 'https://www.eventbrite.com/e/austin-startup-crawl',
    title: 'Austin Startup Crawl',
    description: 'Forty companies, one warehouse, free beer. The classic Austin scramble.',
    startsAt: '2026-09-15T18:30:00-05:00',
    endsAt: '2026-09-15T22:00:00-05:00',
    venueName: 'Native Hostel',
    lat: 30.2688,
    lng: -97.7263,
    tags: ['DevTools', 'AI'],
  },
  {
    source: 'eventbrite',
    sourceEventId: 'eb-stubbs-live',
    sourceUrl: 'https://www.eventbrite.com/e/stubbs-live',
    title: "Live at Stubb's",
    description: 'Outdoor amphitheatre show, doors at 7. Ticketed.',
    startsAt: '2026-09-16T19:00:00-05:00',
    endsAt: '2026-09-16T23:00:00-05:00',
    venueName: "Stubb's Bar-B-Q",
    lat: 30.2686,
    lng: -97.7364,
    tags: [],
  },
  {
    source: 'eventbrite',
    sourceEventId: 'eb-barton-springs',
    sourceUrl: 'https://www.eventbrite.com/e/barton-springs-sunset',
    title: 'Barton Springs Sunset Swim',
    description: 'Sixty-eight degrees year round. Bring a towel.',
    startsAt: '2026-09-17T18:30:00-05:00',
    endsAt: '2026-09-17T20:00:00-05:00',
    venueName: 'Barton Springs Pool',
    lat: 30.264,
    lng: -97.7713,
    tags: ['Climate'],
  },
]

function approve(raw: RawEvent): OffsiteEvent {
  const distance = milesBetween(raw.lat, raw.lng, conference.venueLat, conference.venueLng)
  const matched = raw.tags.filter((t) => conference.topicTags.includes(t))
  const reasons = [
    matched.length ? `matches ${matched.join(', ')}` : 'no tag match',
    `${distance.toFixed(1)} mi from venue`,
  ]

  return {
    id: `${raw.source}:${raw.sourceEventId}`,
    conferenceId: conference.id,
    ...raw,
    isOfficial: raw.source === 'official',
    curationStatus: 'approved',
    curationRationale: reasons.join(' · '),
    submittedByAttendeeId: null,
  }
}

export const events: OffsiteEvent[] = [
  ...officialEvents,
  ...eventbriteEvents,
  ...handCollectedEvents,
].map(approve)

/**
 * Attendee submissions still awaiting a decision.
 *
 * The review queue must not open empty, for the same reason the map never
 * shows "0 going" (DESIGN.md #8): an empty queue reads as a broken feature
 * rather than a calm one. These two also make the demo self-contained — the
 * organizer has something to approve without anyone submitting first.
 */
export const pendingSubmissions: OffsiteEvent[] = [
  {
    ...approve({
      source: 'attendee',
      sourceEventId: 'sub-boardgames',
      sourceUrl: '',
      title: 'Board games + beer',
      description:
        'Grabbing the back room at Emerald Tavern. Bringing Wingspan and Azul, all welcome.',
      startsAt: '2026-09-16T20:00:00-05:00',
      endsAt: '2026-09-16T23:00:00-05:00',
      venueName: 'Emerald Tavern Games & Cafe',
      lat: 30.2711,
      lng: -97.7437,
      tags: ['DevTools'],
    }),
    curationStatus: 'candidate',
    curationRationale: 'Submitted by an attendee',
    submittedByAttendeeId: 'a6',
  },
  {
    ...approve({
      source: 'attendee',
      sourceEventId: 'sub-morningrun',
      sourceUrl: '',
      title: 'Sunrise run along the trail',
      description: 'Easy 3 miles before the keynote. Meeting at the boardwalk entrance.',
      startsAt: '2026-09-17T06:30:00-05:00',
      endsAt: '2026-09-17T07:30:00-05:00',
      venueName: 'Ann and Roy Butler Trail',
      lat: 30.2523,
      lng: -97.7411,
      tags: [],
    }),
    curationStatus: 'candidate',
    curationRationale: 'Submitted by an attendee',
    submittedByAttendeeId: 'a17',
  },
]

/** Rejected candidates, shown in the organizer queue to make curation legible. */
export const rejectedCandidates: OffsiteEvent[] = [
  {
    ...approve({
      source: 'eventbrite',
      sourceEventId: 'eb-5k',
      sourceUrl: 'https://www.eventbrite.com/e/lady-bird-5k',
      title: 'Lady Bird Lake 5K',
      description: 'Charity fun run around the trail.',
      startsAt: '2026-09-16T07:00:00-05:00',
      endsAt: '2026-09-16T09:00:00-05:00',
      venueName: 'Auditorium Shores',
      lat: 30.2622,
      lng: -97.7515,
      tags: [],
    }),
    curationStatus: 'rejected',
    curationRationale: 'no tag match · morning slot · not a networking context',
  },
]
