import type { RawEvent } from '../ingestion/SourceAdapter'

/**
 * Luma, Partiful, and Shotgun events for Tysons Corner, in the exact shape the
 * Eventbrite adapter emits.
 *
 * Unlike the eventbrite slate in eventsTysons.ts, these listings are NOT
 * scraped — neither Luma nor Partiful exposes a public read API (DESIGN.md
 * #14), and Shotgun's DC page has no Tysons supply on this date. They stand in
 * until a partner integration exists, so treat title / time / going-count as
 * representative rather than sourced.
 *
 * The venues, however, are real and findable near 1765 Greensboro Station Pl
 * (issue #8), with geocoded coordinates: The Boro Tysons and CIRCA at The Boro
 * (8305 Greensboro Dr, ~0.15 mi away) and The Tower Club Tysons (8000 Towers
 * Crescent Dr, ~0.9 mi).
 *
 * Single night only (tysonsConference.nights has one date), mirroring
 * fixtures/handCollected.ts's Thursday density: one event per source.
 */
export const handCollectedTysonsEvents: RawEvent[] = [
  {
    source: 'luma',
    sourceEventId: 'luma-tys-fintech-founders-hh',
    externalGoingCount: 65,
    sourceUrl: 'https://lu.ma/fintech-founders-tysons',
    title: 'FinTech Founders Happy Hour',
    description: 'Patio drinks at The Boro. Payments and lending founders, mostly DMV-based.',
    startsAt: '2026-07-30T18:00:00-04:00',
    endsAt: '2026-07-30T20:30:00-04:00',
    venueName: 'The Boro Tysons',
    lat: 38.9241,
    lng: -77.2331,
    tags: ['FinTech'],
  },
  {
    source: 'partiful',
    sourceEventId: 'ptf-tys-founders-dinner',
    externalGoingCount: 18,
    sourceUrl: 'https://partiful.com/e/tysons-founders-dinner',
    title: 'Founders Dinner at CIRCA',
    description: 'Long table, no pitches. Twenty seats at CIRCA, first come.',
    startsAt: '2026-07-30T19:30:00-04:00',
    endsAt: '2026-07-30T22:00:00-04:00',
    venueName: 'CIRCA at The Boro',
    lat: 38.9241,
    lng: -77.2329,
    tags: ['AI'],
  },
  {
    source: 'shotgun',
    sourceEventId: 'sg-tys-rooftop-social',
    externalGoingCount: 210,
    sourceUrl: 'https://shotgun.live/events/tower-club-rooftop-social',
    title: 'Tower Club Rooftop Social',
    description: 'Skyline views over Tysons from the 17th floor. No cover with a summit badge.',
    startsAt: '2026-07-30T20:00:00-04:00',
    endsAt: '2026-07-30T23:00:00-04:00',
    venueName: 'The Tower Club Tysons',
    lat: 38.9146,
    lng: -77.2196,
    tags: ['Design'],
  },
]
