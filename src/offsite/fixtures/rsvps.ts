import type { Rsvp } from '../domain/types'

/**
 * Seeded RSVPs. Official events carry heavy pre-existing attendance because
 * the event platform already holds those registration lists — this is the cold-start
 * answer, not decoration (DESIGN.md #8).
 *
 * The viewer default (a47 / Abhinav) deliberately has NO RSVPs at start, so the
 * reciprocity gate is closed when the demo begins and opening it is a live beat.
 *
 * Only events that remain on the map (or in the review queue) get RSVP seeds —
 * pruned Thursday extras have no rows here.
 */
type Seed = [eventId: string, attendeeIds: string[], anonymousIds?: string[]]

const seeds: Seed[] = [
  // Official
  [
    'official:lts-opening-reception',
    [
      'a2', 'a3', 'a4', 'a5', 'a6', 'a8', 'a14', 'a16', 'a20', 'a39', 'a45', 'a54', 'a57', 'a61',
    ],
    ['a9'],
  ],
  [
    'official:lts-closing-party',
    [
      'a2', 'a3', 'a4', 'a6', 'a8', 'a12', 'a19', 'a39', 'a45', 'a57', 'a61', 'a63',
    ],
    ['a9', 'a13'],
  ],

  // Thursday third-party keepers
  ['eventbrite:eb-startup-crawl', ['a2', 'a39', 'a15']],
  ['partiful:ptf-design-systems-dinner', ['a3', 'a19', 'a57', 'a61', 'a12']],
  ['luma:luma-fintech-after-hours', ['a5', 'a8', 'a14', 'a20', 'a23', 'a39']],
  [
    'shotgun:sg-sunset-boat-party',
    ['a3', 'a19', 'a22', 'a26', 'a31', 'a57', 'a61', 'a56', 'a12', 'a10', 'a24', 'a30', 'a42', 'a44'],
    ['a11'],
  ],
  [
    'attendee:host-cto-fireside',
    [
      'a2', 'a6', 'a16', 'a45', 'a46', 'a50', 'a51', 'a52', 'a53', 'a54', 'a58',
      'a60', 'a62', 'a63', 'a48', 'a49', 'a55', 'a59', 'a39', 'a1',
    ],
    ['a18'],
  ],

  // Friday
  ['partiful:ptf-ai-founders-dinner', ['a2', 'a45', 'a50', 'a52', 'a54', 'a58'], ['a16']],
  ['luma:luma-devtools-hh', ['a2', 'a6', 'a15', 'a16', 'a46', 'a59']],
  ['luma:luma-ai-infra-meetup', ['a2', 'a45', 'a50', 'a54', 'a60']],
  ['partiful:ptf-climate-nightcap', ['a19', 'a8']],
  ['eventbrite:eb-barton-springs', ['a19', 'a61']],
  ['eventbrite:eb-two-step-lessons', ['a19', 'a21', 'a25', 'a29', 'a33', 'a35', 'a41', 'a43', 'a13', 'a22']],
  [
    'attendee:host-tech-meetup-hh',
    [
      'a6', 'a2', 'a7', 'a15', 'a16', 'a17', 'a18', 'a45', 'a46', 'a48', 'a49',
      'a50', 'a51', 'a52', 'a53', 'a54', 'a55', 'a56', 'a58', 'a59', 'a60',
      'a62', 'a63',
    ],
    ['a9'],
  ],
  [
    'shotgun:sg-summit-rooftop-dj',
    ['a3', 'a4', 'a12', 'a19', 'a26', 'a31', 'a56', 'a57', 'a61', 'a45', 'a50', 'a60', 'a63', 'a28', 'a34', 'a40', 'a42'],
    ['a13'],
  ],
  ['shotgun:sg-rooftop-social', ['a3', 'a12', 'a19', 'a57', 'a61', 'a56']],
  ['shotgun:sg-barbarella-throwback', ['a21', 'a24', 'a28', 'a30', 'a32', 'a36', 'a38', 'a40', 'a44', 'a49', 'a51', 'a55']],
  [
    'shotgun:sg-open-air-block-party',
    [
      'a2', 'a6', 'a16', 'a45', 'a46', 'a48', 'a50', 'a51', 'a53', 'a55', 'a58',
      'a59', 'a60', 'a62', 'a63', 'a19', 'a22', 'a26', 'a31', 'a34', 'a36', 'a42',
    ],
    ['a9'],
  ],
  ['partiful:ptf-wine-on-second', ['a3', 'a4', 'a5', 'a8', 'a11', 'a14', 'a57', 'a61']],
  ['partiful:ptf-zilker-picnic', ['a19', 'a8', 'a12', 'a26', 'a56', 'a61', 'a48', 'a63']],
  [
    'partiful:ptf-late-night-pizza',
    ['a45', 'a50', 'a52', 'a55', 'a58', 'a60', 'a62', 'a63', 'a21', 'a32', 'a38', 'a13'],
    ['a9'],
  ],
  ['luma:luma-stripe-payments-eng', ['a1', 'a5', 'a8', 'a14', 'a15', 'a17', 'a20', 'a23', 'a39', 'a11']],
  ['luma:luma-nvidia-inference', ['a2', 'a45', 'a50', 'a52', 'a54', 'a58', 'a60', 'a62', 'a16', 'a53']],
  ['luma:luma-datadog-observability', ['a6', 'a7', 'a18', 'a46', 'a48', 'a49', 'a51', 'a55', 'a59']],
  ['luma:luma-github-open-source', ['a2', 'a45', 'a46', 'a50', 'a51', 'a53', 'a58', 'a60', 'a62', 'a63', 'a55']],
]

export const rsvps: Rsvp[] = seeds.flatMap(([eventId, attendeeIds, anonymousIds = []]) => [
  ...attendeeIds.map((attendeeId) => make(eventId, attendeeId, false)),
  ...anonymousIds.map((attendeeId) => make(eventId, attendeeId, true)),
])

function make(eventId: string, attendeeId: string, anonymous: boolean): Rsvp {
  return {
    id: `${eventId}::${attendeeId}`,
    eventId,
    attendeeId,
    createdAt: '2026-07-20T12:00:00-05:00',
    anonymous,
  }
}
