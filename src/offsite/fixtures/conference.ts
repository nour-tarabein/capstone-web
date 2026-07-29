import type { Conference } from '../domain/types'

/** Austin — walkable, dense real nightlife supply, downtown venue (DESIGN.md #12). */
export const conference: Conference = {
  id: 'lts-2026',
  name: 'Lonestar Tech Summit 2026',
  city: 'Austin, TX',
  venueName: 'Austin Convention Center',
  venueLat: 30.2637,
  venueLng: -97.7397,
  nights: ['2026-07-30', '2026-07-31'],
  topicTags: ['AI', 'FinTech', 'DevTools', 'Design', 'Climate'],
}

/**
 * Tysons Corner — second conference fixture for the conference-scoped data
 * prefactor. Placeholder personnel and events only (see fixtures/attendeesTysons.ts
 * and fixtures/eventsTysons.ts); no screen reads this yet, so nothing about the
 * app's current Austin-only behavior changes.
 */
export const tysonsConference: Conference = {
  id: 'lts-tysons-2026',
  name: 'Lonestar Tech Summit 2026',
  city: 'McLean, VA',
  venueName: '1765 Greensboro Station Pl, 7th Floor',
  venueLat: 38.9196,
  venueLng: -77.2264,
  nights: ['2026-07-30'],
  topicTags: ['AI', 'FinTech', 'DevTools', 'Design', 'Climate'],
}

export const conferences: Conference[] = [conference, tysonsConference]
export const conferencesById = new Map(conferences.map((c) => [c.id, c]))

export const nightLabels: Record<string, string> = {
  '2026-07-30': 'Thu',
  '2026-07-31': 'Fri',
}
