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

export const nightLabels: Record<string, string> = {
  '2026-07-30': 'Thu',
  '2026-07-31': 'Fri',
}
