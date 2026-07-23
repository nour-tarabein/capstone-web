import type { Conference, OffsiteEvent } from '../domain/types'
import type { RawEvent } from './SourceAdapter'

/**
 * Hard curation (DESIGN.md #4).
 *
 * Density is the whole game. An unfiltered city firehose scatters 5,000
 * attendees across 300 events and every pin reads "0 going", which is worse
 * than shipping nothing. We ingest broadly and cut hard — roughly 10–20
 * events per night — so that overlap is arithmetically likely.
 *
 * Output is a ranked candidate list for the organizer approval queue
 * (DESIGN.md #5), not a published slate. Nothing reaches the map without
 * organizer approval.
 */

const RADIUS_MILES = 2
const MAX_PER_NIGHT = 20

export interface CurationWeights {
  tagMatch: number
  proximity: number
  eveningSlot: number
}

const DEFAULT_WEIGHTS: CurationWeights = {
  tagMatch: 5,
  proximity: 3,
  eveningSlot: 2,
}

export function curate(
  raw: RawEvent[],
  conference: Conference,
  weights: CurationWeights = DEFAULT_WEIGHTS,
): OffsiteEvent[] {
  const withinRadius = raw.filter(
    (e) => milesBetween(e.lat, e.lng, conference.venueLat, conference.venueLng) <= RADIUS_MILES,
  )

  const byNight = new Map<string, OffsiteEvent[]>()

  for (const event of withinRadius) {
    const night = event.startsAt.slice(0, 10)
    if (!conference.nights.includes(night)) continue

    const scored = scoreEvent(event, conference, weights)
    const bucket = byNight.get(night) ?? []
    bucket.push(scored)
    byNight.set(night, bucket)
  }

  return [...byNight.values()].flatMap((bucket) =>
    bucket.sort(byRationaleScore).slice(0, MAX_PER_NIGHT),
  )
}

/** Score is folded into the rationale string the organizer sees. */
const scores = new WeakMap<OffsiteEvent, number>()

function byRationaleScore(a: OffsiteEvent, b: OffsiteEvent) {
  return (scores.get(b) ?? 0) - (scores.get(a) ?? 0)
}

function scoreEvent(
  raw: RawEvent,
  conference: Conference,
  weights: CurationWeights,
): OffsiteEvent {
  const matchedTags = raw.tags.filter((t) => conference.topicTags.includes(t))
  const distance = milesBetween(raw.lat, raw.lng, conference.venueLat, conference.venueLng)
  const hour = new Date(raw.startsAt).getHours()
  const isEvening = hour >= 17

  const total =
    matchedTags.length * weights.tagMatch +
    (RADIUS_MILES - distance) * weights.proximity +
    (isEvening ? weights.eveningSlot : 0)

  const reasons: string[] = []
  if (matchedTags.length) reasons.push(`matches ${matchedTags.join(', ')}`)
  reasons.push(`${distance.toFixed(1)} mi from venue`)
  if (isEvening) reasons.push('evening slot')

  const event: OffsiteEvent = {
    id: `${raw.source}:${raw.sourceEventId}`,
    conferenceId: conference.id,
    ...raw,
    isOfficial: false,
    curationStatus: 'candidate',
    curationRationale: reasons.join(' · '),
    submittedByAttendeeId: null,
  }

  scores.set(event, total)
  return event
}

/** Haversine, miles. */
function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export { milesBetween }
