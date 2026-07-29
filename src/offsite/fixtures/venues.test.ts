import { describe, expect, it } from 'vitest'
import { milesBetween } from '../ingestion/curate'
import { conference, tysonsConference } from './conference'
import { venuesForConference } from './venues'

/** Same radius the ingestion curator uses — a pin outside this is obviously wrong. */
const SANE_RADIUS_MILES = 2

const AUSTIN_VENUE_NAMES = [
  'Capital Factory',
  'Half Step',
  'Emmer & Rye',
  "Banger's",
  'The Bungalow Rooftop',
  "Kitty Cohen's",
] as const

const TYSONS_VENUE_NAMES = [
  'Whole Foods Market at The Boro',
  'Yard House at Tysons Galleria',
  'Shipgarten',
] as const

describe('venuesForConference', () => {
  it('returns Austin downtown venues unchanged for the Austin conference', () => {
    const venues = venuesForConference(conference.id)
    expect(venues.map((v) => v.name)).toEqual([...AUSTIN_VENUE_NAMES])
    expect(venues).toEqual([
      { name: 'Capital Factory', lat: 30.2686, lng: -97.7409 },
      { name: 'Half Step', lat: 30.2549, lng: -97.7383 },
      { name: 'Emmer & Rye', lat: 30.2597, lng: -97.7395 },
      { name: "Banger's", lat: 30.2551, lng: -97.7379 },
      { name: 'The Bungalow Rooftop', lat: 30.2557, lng: -97.7392 },
      { name: "Kitty Cohen's", lat: 30.2649, lng: -97.7213 },
    ])
  })

  it('offers only the McLean-area catalogue for Tysons Corner', () => {
    const venues = venuesForConference(tysonsConference.id)
    expect(venues.map((v) => v.name)).toEqual([...TYSONS_VENUE_NAMES])
    for (const name of AUSTIN_VENUE_NAMES) {
      expect(venues.some((v) => v.name === name)).toBe(false)
    }
  })

  it('reuses the Yard House coordinate already present in Tysons fixtures', () => {
    const yardHouse = venuesForConference(tysonsConference.id).find(
      (v) => v.name === 'Yard House at Tysons Galleria',
    )
    expect(yardHouse).toEqual({ name: 'Yard House at Tysons Galleria', lat: 38.9249, lng: -77.2256 })
  })

  it('does not reuse The Boro development pin for Whole Foods or Shipgarten', () => {
    // The Boro development pin used by handCollectedTysons / seed SQL.
    const boroDevelopment = { lat: 38.9241, lng: -77.2331 }
    const venues = venuesForConference(tysonsConference.id)
    const wholeFoods = venues.find((v) => v.name === 'Whole Foods Market at The Boro')
    const shipgarten = venues.find((v) => v.name === 'Shipgarten')
    expect(wholeFoods).toBeDefined()
    expect(shipgarten).toBeDefined()
    expect({ lat: wholeFoods!.lat, lng: wholeFoods!.lng }).not.toEqual(boroDevelopment)
    expect({ lat: shipgarten!.lat, lng: shipgarten!.lng }).not.toEqual(boroDevelopment)
  })

  it('returns an empty catalogue for an unknown conference id', () => {
    expect(venuesForConference('not-a-conference')).toEqual([])
  })

  it('keeps venue names unique within each catalogue', () => {
    for (const id of [conference.id, tysonsConference.id]) {
      const names = venuesForConference(id).map((v) => v.name)
      expect(names).toEqual([...new Set(names)])
    }
  })

  it('places every venue within a sane radius of its own conference venue', () => {
    for (const conf of [conference, tysonsConference]) {
      for (const venue of venuesForConference(conf.id)) {
        const miles = milesBetween(venue.lat, venue.lng, conf.venueLat, conf.venueLng)
        expect(
          miles,
          `${venue.name} is ${miles.toFixed(1)} mi from ${conf.venueName}`,
        ).toBeLessThanOrEqual(SANE_RADIUS_MILES)
      }
    }
  })

  it('does not put either catalogue inside the other conference radius', () => {
    for (const venue of venuesForConference(conference.id)) {
      const miles = milesBetween(
        venue.lat,
        venue.lng,
        tysonsConference.venueLat,
        tysonsConference.venueLng,
      )
      expect(miles).toBeGreaterThan(SANE_RADIUS_MILES)
    }
    for (const venue of venuesForConference(tysonsConference.id)) {
      const miles = milesBetween(
        venue.lat,
        venue.lng,
        conference.venueLat,
        conference.venueLng,
      )
      expect(miles).toBeGreaterThan(SANE_RADIUS_MILES)
    }
  })
})
