import type { OffsiteEvent } from '../domain/types'
import type { RawEvent } from '../ingestion/SourceAdapter'
import { conference } from './conference'
import { handCollectedEvents } from './handCollected'
import { milesBetween } from '../ingestion/curate'

/**
 * The approved nightly slate — what actually reaches the map.
 *
 * Thursday is one-per-source so the pitch map stays scannable. Opening
 * Reception + Startup Crawl live here; handCollected / hostedEvents supply
 * the remaining Thu sources. Friday can stack multiple pins per source.
 * Official events carry pre-existing RSVPs (DESIGN.md #8).
 */
const officialEvents: RawEvent[] = [
  {
    source: 'official',
    sourceEventId: 'lts-opening-reception',
    sourceUrl: '#',
    title: 'Summit Opening Reception',
    description: 'Drinks and small plates on the terrace. Badge required.',
    startsAt: '2026-07-30T18:00:00-05:00',
    endsAt: '2026-07-30T21:00:00-05:00',
    venueName: 'Austin Convention Center - Terrace',
    lat: 30.2637,
    lng: -97.7397,
    tags: ['AI', 'FinTech', 'DevTools', 'Design', 'Climate'],
  },
  {
    source: 'official',
    sourceEventId: 'lts-closing-party',
    sourceUrl: '#',
    title: 'Closing Party',
    description: 'Rainey Street. Live music, tacos, and the last chance to swap numbers.',
    startsAt: '2026-07-31T20:00:00-05:00',
    endsAt: '2026-07-31T23:59:00-05:00',
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
    externalGoingCount: 900,
    sourceUrl: 'https://www.eventbrite.com/e/austin-startup-crawl',
    title: 'Austin Startup Crawl',
    description: 'Forty companies, one warehouse, free beer. The classic Austin scramble.',
    startsAt: '2026-07-30T18:30:00-05:00',
    endsAt: '2026-07-30T22:00:00-05:00',
    venueName: 'Native Hostel',
    lat: 30.2688,
    lng: -97.7263,
    tags: ['DevTools', 'AI'],
  },
  {
    source: 'eventbrite',
    sourceEventId: 'eb-barton-springs',
    externalGoingCount: 180,
    sourceUrl: 'https://www.eventbrite.com/e/barton-springs-sunset',
    title: 'Barton Springs Sunset Swim',
    description: 'Sixty-eight degrees year round. Bring a towel.',
    startsAt: '2026-07-31T18:30:00-05:00',
    endsAt: '2026-07-31T20:00:00-05:00',
    venueName: 'Barton Springs Pool',
    lat: 30.264,
    lng: -97.7713,
    tags: ['Climate'],
  },
  {
    source: 'eventbrite',
    sourceEventId: 'eb-two-step-lessons',
    externalGoingCount: 260,
    sourceUrl: 'https://www.eventbrite.com/e/white-horse-two-step',
    title: 'Two-Step Lessons at the White Horse',
    description: 'Free lesson at 7, band at 8, no experience and no partner needed.',
    startsAt: '2026-07-31T19:00:00-05:00',
    endsAt: '2026-07-31T23:00:00-05:00',
    venueName: 'The White Horse',
    lat: 30.2637,
    lng: -97.7169,
    tags: [],
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

/**
 * Attendee-hosted events the organizer has already approved.
 *
 * Same `attendee` source as the review queue, one state later: these went
 * through the gate and reached the map, so the demo can show both ends of the
 * submission loop without anyone having to approve something live. The host is
 * named on the card — putting your name on an event you host is the opt-in
 * (DESIGN.md #3), which is why these carry a real attendee id rather than null.
 */
const hostedEvents: OffsiteEvent[] = [
  {
    ...approve({
      source: 'attendee',
      sourceEventId: 'host-cto-fireside',
      sourceUrl: '',
      title: 'CTO Fireside: Shipping AI in Production',
      description:
        'Off the record, no slides. What actually broke when we put models in front of customers — and what we would do differently. Thirty seats.',
      startsAt: '2026-07-30T18:00:00-05:00',
      endsAt: '2026-07-30T20:30:00-05:00',
      venueName: 'The Roosevelt Room',
      lat: 30.2683,
      lng: -97.7477,
      tags: ['AI', 'DevTools'],
    }),
    curationRationale: 'Hosted by an attendee · approved by the organizer',
    submittedByAttendeeId: 'a2', // David Quattrone, CTO
  },
  {
    ...approve({
      source: 'attendee',
      sourceEventId: 'host-tech-meetup-hh',
      sourceUrl: '',
      title: 'Tech Meetup Happy Hour',
      description:
        'The engineering side of the summit, on a patio, before the parties start. Interns very much included.',
      startsAt: '2026-07-31T17:30:00-05:00',
      endsAt: '2026-07-31T20:00:00-05:00',
      venueName: 'Easy Tiger',
      lat: 30.2679,
      lng: -97.7392,
      tags: ['DevTools', 'AI'],
    }),
    curationRationale: 'Hosted by an attendee · approved by the organizer',
    submittedByAttendeeId: 'a6', // Pradeep Mannakkara, SVP and CIO
  },
]

export const events: OffsiteEvent[] = [
  ...[...officialEvents, ...eventbriteEvents, ...handCollectedEvents].map(approve),
  ...hostedEvents,
]

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
      startsAt: '2026-07-30T20:00:00-05:00',
      endsAt: '2026-07-30T23:00:00-05:00',
      venueName: 'Emerald Tavern Games & Cafe',
      lat: 30.2711,
      lng: -97.7437,
      tags: ['DevTools'],
    }),
    curationStatus: 'candidate',
    curationRationale: 'Submitted by an attendee',
    submittedByAttendeeId: 'a2', // David Quattrone
  },
  {
    ...approve({
      source: 'attendee',
      sourceEventId: 'sub-morningrun',
      sourceUrl: '',
      title: 'Sunrise run along the trail',
      description: 'Easy 3 miles before the keynote. Meeting at the boardwalk entrance.',
      startsAt: '2026-07-31T06:30:00-05:00',
      endsAt: '2026-07-31T07:30:00-05:00',
      venueName: 'Ann and Roy Butler Trail',
      lat: 30.2523,
      lng: -97.7411,
      tags: [],
    }),
    curationStatus: 'candidate',
    curationRationale: 'Submitted by an attendee',
    submittedByAttendeeId: 'a47', // Abhinav Pappu
  },
]

/** Rejected candidates, shown in the organizer queue to make curation legible. */
export const rejectedCandidates: OffsiteEvent[] = [
  {
    ...approve({
      source: 'eventbrite',
      sourceEventId: 'eb-5k',
      externalGoingCount: 340,
      sourceUrl: 'https://www.eventbrite.com/e/lady-bird-5k',
      title: 'Lady Bird Lake 5K',
      description: 'Charity fun run around the trail.',
      startsAt: '2026-07-30T07:00:00-05:00',
      endsAt: '2026-07-30T09:00:00-05:00',
      venueName: 'Auditorium Shores',
      lat: 30.2622,
      lng: -97.7515,
      tags: [],
    }),
    curationStatus: 'rejected',
    curationRationale: 'no tag match · morning slot · not a networking context',
  },
]
