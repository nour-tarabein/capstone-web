import type { OffsiteEvent } from '../domain/types'
import type { RawEvent } from '../ingestion/SourceAdapter'
import { tysonsConference } from './conference'
import { handCollectedTysonsEvents } from './handCollectedTysons'
import { milesBetween } from '../ingestion/curate'

/**
 * Events for the Tysons Corner fixture, seeded per issue #8, all within ~1.3
 * mi of 1765 Greensboro Station Pl, McLean VA.
 *
 * The `eventbrite` slate below is genuinely real — scraped from Eventbrite's
 * 2026-07-30 Tysons Corner listings and individually verified (see the note on
 * that array). The `luma` / `partiful` / `shotgun` slate in
 * handCollectedTysons.ts is representative rather than scraped, because
 * neither Luma nor Partiful exposes a public read API; it uses real Tysons
 * venues so the map stays believable.
 *
 * One night only (tysonsConference.nights has a single date), so there is no
 * Thursday/Friday split to keep sparse.
 */
const officialEvents: RawEvent[] = [
  {
    source: 'official',
    sourceEventId: 'tys-opening-reception',
    sourceUrl: '#',
    title: 'Tysons Opening Reception',
    description: 'Drinks and small plates in the lobby. Badge required.',
    startsAt: '2026-07-30T18:00:00-04:00',
    endsAt: '2026-07-30T21:00:00-04:00',
    venueName: '1765 Greensboro Station Pl - Lobby',
    lat: 38.9196,
    lng: -77.2264,
    tags: ['AI', 'FinTech', 'DevTools', 'Design', 'Climate'],
  },
]

/**
 * Real Eventbrite listings for 2026-07-30 near Tysons Corner (DESIGN.md #14),
 * scraped from eventbrite.com/d/va--reston/events--tomorrow/tysons-corner.
 * Every one was opened individually and confirmed live and not postponed;
 * titles, venues, addresses and times are verbatim from the listing, and
 * lat/lng are the geocoded street addresses.
 *
 * `externalGoingCount` is the one approximated field — Eventbrite publishes a
 * badge ("Almost full", "Sales end soon") rather than a number on these, so
 * these are order-of-magnitude stand-ins consistent with that badge, not
 * scraped counts.
 */
const eventbriteEvents: RawEvent[] = [
  {
    source: 'eventbrite',
    sourceEventId: 'tys-eb-cocktail-contest',
    externalGoingCount: 150,
    sourceUrl:
      'https://www.eventbrite.com/e/cocktail-contest-capital-one-center-culinary-week-tickets-1991982494263',
    title: 'Cocktail Contest - Capital One Center Culinary Week',
    description:
      'Six master mixologists compete with globally-inspired cocktails while guests sample five drinks, enjoy award-winning bites, and vote for a favourite. Outdoor bar and patio, 21+.',
    startsAt: '2026-07-30T16:30:00-04:00',
    endsAt: '2026-07-30T19:30:00-04:00',
    venueName: 'Ometeo, Capital One Center',
    lat: 38.9257,
    lng: -77.2109,
    tags: [],
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
      sourceEventId: 'tys-host-ceo-roundtable',
      sourceUrl: '',
      title: 'CEO Roundtable: Scaling in 2026',
      description: 'Off the record, no slides. Twenty-five seats in the Capital One Hall greenroom.',
      startsAt: '2026-07-30T19:00:00-04:00',
      endsAt: '2026-07-30T21:00:00-04:00',
      venueName: 'Capital One Hall',
      lat: 38.9255,
      lng: -77.2113,
      tags: ['AI', 'FinTech'],
    }),
    curationRationale: 'Hosted by an attendee · approved by the organizer',
    submittedByAttendeeId: 't9', // Marc Benioff, CEO, Salesforce
  },
]

export const tysonsEvents: OffsiteEvent[] = [
  ...[...officialEvents, ...eventbriteEvents, ...handCollectedTysonsEvents].map(approve),
  ...hostedEvents,
]

export const tysonsPendingSubmissions: OffsiteEvent[] = [
  {
    ...approve({
      source: 'attendee',
      sourceEventId: 'tys-sub-scotts-run-walk',
      sourceUrl: '',
      title: 'Sunrise Walk at Scotts Run',
      description: 'Easy loop through Scotts Run Nature Preserve before the keynote. Meet at the trailhead.',
      startsAt: '2026-07-30T07:00:00-04:00',
      endsAt: '2026-07-30T08:00:00-04:00',
      venueName: 'Scotts Run Nature Preserve',
      lat: 38.9574,
      lng: -77.2013,
      tags: [],
    }),
    curationStatus: 'candidate',
    curationRationale: 'Submitted by an attendee',
    submittedByAttendeeId: 't4', // Andy Jassy, CEO, Amazon
  },
]

export const tysonsRejectedCandidates: OffsiteEvent[] = [
  {
    ...approve({
      source: 'eventbrite',
      sourceEventId: 'tys-eb-bni-breakfast',
      externalGoingCount: 25,
      sourceUrl:
        'https://www.eventbrite.com/e/bni-tysons-mastermind-networking-breakfast-tickets-1983480465466',
      title: 'BNI Tysons Mastermind Networking Breakfast',
      description:
        'Weekly referral-networking breakfast for local business owners. Free to attend, free parking.',
      startsAt: '2026-07-30T08:00:00-04:00',
      endsAt: '2026-07-30T09:30:00-04:00',
      venueName: 'Intelligent Office - Tysons Corner',
      lat: 38.912,
      lng: -77.2224,
      tags: [],
    }),
    curationStatus: 'rejected',
    curationRationale: 'no tag match · morning slot · clashes with the keynote',
  },
]
