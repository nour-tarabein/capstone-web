import type { Conference } from '../domain/types'

/** Austin — walkable, dense real nightlife supply, downtown venue (DESIGN.md #12). */
export const conference: Conference = {
  id: 'lts-2026',
  name: 'Lonestar Tech Summit 2026',
  city: 'Austin, TX',
  venueName: 'Austin Convention Center',
  venueLat: 30.2637,
  venueLng: -97.7397,
  nights: ['2026-09-15', '2026-09-16', '2026-09-17'],
  topicTags: ['AI', 'FinTech', 'DevTools', 'Design', 'Climate'],
}

export const nightLabels: Record<string, string> = {
  '2026-09-15': 'Tue',
  '2026-09-16': 'Wed',
  '2026-09-17': 'Thu',
}
