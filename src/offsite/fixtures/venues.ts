import { conference, tysonsConference } from './conference'

/**
 * A pre-geocoded place an attendee can pick when hosting an event.
 * Adding a venue is a one-line append to the relevant catalogue array —
 * HostSheet reads through `venuesForConference`, so no other file changes.
 */
export interface CatalogueVenue {
  name: string
  lat: number
  lng: number
}

/**
 * Per-conference venue catalogues for the hosting form (issue #23).
 *
 * Hardcoded and pre-geocoded on purpose: no Mapbox token, no autocomplete
 * network call, no offline degradation. An unknown conference id returns
 * an empty list rather than falling back to Austin's.
 */
const austinVenues: CatalogueVenue[] = [
  { name: 'Capital Factory', lat: 30.2686, lng: -97.7409 },
  { name: 'Half Step', lat: 30.2549, lng: -97.7383 },
  { name: 'Emmer & Rye', lat: 30.2597, lng: -97.7395 },
  { name: "Banger's", lat: 30.2551, lng: -97.7379 },
  { name: 'The Bungalow Rooftop', lat: 30.2557, lng: -97.7392 },
  { name: "Kitty Cohen's", lat: 30.2649, lng: -97.7213 },
]

/**
 * McLean-area venues for Tysons Corner.
 *
 * - Whole Foods Market at The Boro: geocoded from 1636 Boro Pl (OSM store
 *   node; distinct from The Boro development's pin used elsewhere).
 * - Yard House at Tysons Galleria: reuses the coordinate already in
 *   happyHoursTysons.ts / seed SQL.
 * - Shipgarten: outdoor biergarten at 7581 Colshire Dr — geocoded from that
 *   street address, not estimated from the street name alone.
 */
const tysonsVenues: CatalogueVenue[] = [
  { name: 'Whole Foods Market at The Boro', lat: 38.9250, lng: -77.2335 },
  { name: 'Yard House at Tysons Galleria', lat: 38.9249, lng: -77.2256 },
  { name: 'Shipgarten', lat: 38.9227, lng: -77.2076 },
]

const cataloguesByConferenceId = new Map<string, CatalogueVenue[]>([
  [conference.id, austinVenues],
  [tysonsConference.id, tysonsVenues],
])

/** Venues offered on the hosting form for `conferenceId`. Empty if unknown. */
export function venuesForConference(conferenceId: string): CatalogueVenue[] {
  return cataloguesByConferenceId.get(conferenceId) ?? []
}
