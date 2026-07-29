import type { RawEvent } from '../ingestion/SourceAdapter'

/**
 * Attendee-proposed after-work happy hours at real Tysons / McLean bars, for
 * the night of the Tysons conference (issue #8).
 *
 * Venues and happy-hour windows come from dmvhappyhours.com's Tysons & McLean
 * guide; every address was geocoded against the US Census geocoder. These are
 * `source: 'attendee'` — someone at the summit proposing "let's go here after"
 * — so unlike the eventbrite slate there is no ticket to buy, no sourceUrl,
 * and no externalGoingCount (an attendee event has no public audience beyond
 * the conference; see OffsiteEvent.externalGoingCount).
 *
 * Start times sit inside each venue's actual stated happy-hour window so the
 * deal quoted in the description is really on. Where the guide states no
 * window, or states one that does not run on a Thursday, the description does
 * not quote a deal — see Shipgarten.
 */
export interface HappyHourSeed {
  raw: RawEvent
  /** Which CEO proposed it — surfaced on the card, the opt-in for hosting. */
  hostId: string
}

export const tysonsHappyHours: HappyHourSeed[] = [
  {
    hostId: 't26', // Jamie Dimon, JPMorgan Chase
    raw: {
      source: 'attendee',
      sourceEventId: 'tys-hh-founding-farmers',
      sourceUrl: '',
      title: 'Happy Hour at Founding Farmers',
      description:
        'Bar and patio happy hour runs 3:30–6. Craft cocktails, local drafts, $6.99 chicken tenders and $5.99 fried mac & cheese bites. Walk over straight from the last session.',
      startsAt: '2026-07-30T17:00:00-04:00',
      endsAt: '2026-07-30T18:00:00-04:00',
      venueName: 'Founding Farmers Tysons',
      lat: 38.9223,
      lng: -77.2225,
      tags: ['FinTech'],
    },
  },
  {
    hostId: 't15', // Brian Chesky, Airbnb
    raw: {
      source: 'attendee',
      sourceEventId: 'tys-hh-north-italia',
      sourceUrl: '',
      title: 'Drinks at North Italia',
      description:
        'Bar-only happy hour, 3–6: $8 wine and sangria, $5.50 beers, plus the $44 Bottle & Board. Two minutes from the venue at The Boro.',
      startsAt: '2026-07-30T17:00:00-04:00',
      endsAt: '2026-07-30T18:30:00-04:00',
      venueName: 'North Italia',
      lat: 38.9243,
      lng: -77.2331,
      tags: ['Design'],
    },
  },
  {
    hostId: 't33', // Doug McMillon, Walmart
    raw: {
      source: 'attendee',
      sourceEventId: 'tys-hh-barrel-bushel',
      sourceUrl: '',
      title: 'Barrel & Bushel Happy Hour',
      description:
        'Happy hour to 6:30 in the Hyatt at Tysons Corner Center: $5 select drafts, $6 wines, $7 cocktails and discounted apps.',
      startsAt: '2026-07-30T17:00:00-04:00',
      endsAt: '2026-07-30T18:30:00-04:00',
      venueName: 'Barrel & Bushel',
      lat: 38.9187,
      lng: -77.22,
      tags: [],
    },
  },
  {
    hostId: 't29', // David Solomon, Goldman Sachs
    raw: {
      source: 'attendee',
      sourceEventId: 'tys-hh-eddie-v',
      sourceUrl: '',
      title: "Oysters at Eddie V's",
      description:
        'V Lounge happy hour to 7: $7 cocktails, discounted wines by the glass, and the raw bar. Live music most nights.',
      startsAt: '2026-07-30T17:30:00-04:00',
      endsAt: '2026-07-30T19:00:00-04:00',
      venueName: "Eddie V's Prime Seafood",
      lat: 38.9194,
      lng: -77.2199,
      tags: ['FinTech'],
    },
  },
  {
    hostId: 't11', // Shantanu Narayen, Adobe
    raw: {
      source: 'attendee',
      sourceEventId: 'tys-hh-agora',
      sourceUrl: '',
      title: 'Mezze and Cocktails at Agora',
      description:
        'Mediterranean small plates and cocktails on Westpark. Shareable by design — good for a table that keeps growing.',
      startsAt: '2026-07-30T17:30:00-04:00',
      endsAt: '2026-07-30T20:00:00-04:00',
      venueName: 'Agora Tysons',
      lat: 38.9251,
      lng: -77.2189,
      tags: ['Design'],
    },
  },
  {
    hostId: 't32', // Warren Buffett, Berkshire Hathaway
    raw: {
      source: 'attendee',
      sourceEventId: 'tys-hh-the-palm',
      sourceUrl: '',
      title: 'Steaks at The Palm',
      description:
        'Bar happy hour at the Tysons Blvd steakhouse. Kitchen closes at 9, so this one starts early and ends clean.',
      startsAt: '2026-07-30T17:30:00-04:00',
      endsAt: '2026-07-30T19:30:00-04:00',
      venueName: 'The Palm - Tysons',
      lat: 38.9246,
      lng: -77.2224,
      tags: ['FinTech'],
    },
  },
  {
    hostId: 't7', // Elon Musk, Tesla
    raw: {
      source: 'attendee',
      sourceEventId: 'tys-hh-shipgarten',
      sourceUrl: '',
      title: 'Beer Garden Meetup at Shipgarten',
      description:
        'Four food and drink concepts out of 40ft shipping containers at Scotts Run, including the revived Tysons Biergarten. Outdoor, dog-friendly, no reservation needed. (The posted happy hour is Tuesdays, so this is full price.)',
      startsAt: '2026-07-30T18:00:00-04:00',
      endsAt: '2026-07-30T21:00:00-04:00',
      venueName: 'Shipgarten',
      lat: 38.9239,
      lng: -77.2072,
      tags: ['Climate'],
    },
  },
  {
    hostId: 't46', // James Quincey, Coca-Cola
    raw: {
      source: 'attendee',
      sourceEventId: 'tys-hh-ometeo',
      sourceUrl: '',
      title: 'Nightcap at Ometeo',
      description:
        'Straight after the Culinary Week cocktail contest wraps at the same venue — stay on the patio for a quieter round.',
      startsAt: '2026-07-30T20:00:00-04:00',
      endsAt: '2026-07-30T22:00:00-04:00',
      venueName: 'Ometeo, Capital One Center',
      lat: 38.9257,
      lng: -77.2109,
      tags: [],
    },
  },
  {
    hostId: 't19', // Tim Sweeney, Epic Games
    raw: {
      source: 'attendee',
      sourceEventId: 'tys-hh-yard-house',
      sourceUrl: '',
      title: 'Late Round at Yard House',
      description:
        '130 beers on tap and half-price select appetizers at Tysons Galleria. The default last stop.',
      startsAt: '2026-07-30T21:00:00-04:00',
      endsAt: '2026-07-30T23:30:00-04:00',
      venueName: 'Yard House',
      lat: 38.9249,
      lng: -77.2256,
      tags: [],
    },
  },
  {
    hostId: 't14', // Dara Khosrowshahi, Uber
    raw: {
      source: 'attendee',
      sourceEventId: 'tys-hh-earls',
      sourceUrl: '',
      title: 'Late Night at Earls Kitchen + Bar',
      description:
        'Earls runs a second happy hour from 9pm: $5 beer, $6 wine, $7 cocktails and the truffle fries. Right by the Tysons Corner Metro if you are training back.',
      startsAt: '2026-07-30T21:00:00-04:00',
      endsAt: '2026-07-30T23:00:00-04:00',
      venueName: 'Earls Kitchen + Bar',
      lat: 38.9194,
      lng: -77.2209,
      tags: [],
    },
  },
]
