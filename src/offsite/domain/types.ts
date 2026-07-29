/**
 * Core domain types. See DESIGN.md for the decisions these encode.
 */

export type EventSource =
  | 'eventbrite'
  | 'luma'
  | 'partiful'
  | 'shotgun'
  | 'official'
  /** Proposed by an attendee from inside the app, not scraped from a platform. */
  | 'attendee'

/** Where a source sits on the road to a real integration (DESIGN.md #14). */
export type SourceStatus = 'live-api' | 'pending-partner-api'

/** Organizer approval state (DESIGN.md #5). */
export type CurationStatus = 'candidate' | 'approved' | 'rejected'

export interface Conference {
  id: string
  name: string
  city: string
  venueName: string
  /** Read-time fallback when the stored viewer is not part of this conference. */
  defaultViewerId: string
  /** Curation radius and "distance from venue" are both measured from here. */
  venueLat: number
  venueLng: number
  /** ISO dates, one per conference day. Drives the night selector (DESIGN.md #7). */
  nights: string[]
  topicTags: string[]
}

export interface OffsiteEvent {
  id: string
  conferenceId: string
  source: EventSource
  sourceEventId: string
  /** Deep-link out to complete the real ticket. We never own the ticket (DESIGN.md #2). */
  sourceUrl: string
  title: string
  description: string
  startsAt: string
  endsAt: string | null
  venueName: string
  lat: number
  lng: number
  tags: string[]
  /**
   * How many non-summit people the source platform says are going.
   *
   * Static metadata the platform advertises publicly, NOT an aggregate over our
   * rsvps table. That distinction is the whole reason it can render while the
   * attending list is still gated: there is no identity in it, so showing the
   * size of the room gives nothing away about who is in it.
   *
   * Undefined for official and attendee-hosted events, which have no public
   * audience beyond the conference.
   */
  externalGoingCount?: number
  /** Official conference after-parties, pinned by the organizer and pre-seeded
   *  with real RSVPs — this is what keeps the map non-empty (DESIGN.md #8). */
  isOfficial: boolean
  curationStatus: CurationStatus
  /** Why the ingestion ranker surfaced this. Shown in the organizer queue. */
  curationRationale: string
  /**
   * Set only for `source: 'attendee'` — who proposed it.
   *
   * Note this deliberately does NOT violate the no-reverse-lookup rule
   * (DESIGN.md #9). That rule protects *attendance*: you never get to ask
   * "which events is Abhinav going to". Hosting is the opposite — a public,
   * opt-in act, the same as being listed as an organizer. Your name is on the
   * event you propose, and the submission form says so before you submit.
   */
  submittedByAttendeeId: string | null
}

/**
 * What an attendee fills in to propose an event. Everything the organizer
 * controls — id, source, curation status — is assigned server-side, so the
 * client cannot submit something pre-approved.
 */
export interface EventDraft {
  title: string
  description: string
  /** ISO 8601 with the conference's offset, e.g. "2026-09-16T19:30:00-05:00". */
  startsAt: string
  venueName: string
  lat: number
  lng: number
  submittedByAttendeeId: string
}

/**
 * A candidate awaiting an organizer decision, joined to the submitter so the
 * queue can say who is asking without a second round trip. Name is null for
 * ranker-surfaced third-party events, which nobody submitted.
 */
export interface PendingEvent extends OffsiteEvent {
  submittedByName: string | null
  submittedByCompany: string | null
}

export interface Attendee {
  id: string
  conferenceId: string
  name: string
  title: string
  company: string
  photoUrl: string
  interests: string[]
  sessionIds: string[]
  /** Inherited from the existing Attendee Hub directory opt-in (DESIGN.md #3).
   *  If false, this attendee is never named anywhere — only counted. */
  directoryOptIn: boolean
}

/**
 * What the Tysons Corner welcome/check-in screen collects to manufacture a
 * brand-new attendee for a browser with no existing identity (issue #5).
 * Everything else on Attendee — id, title, photo, interests, session ids,
 * directory opt-in — is assigned server-side / in the mock bundle, mirroring
 * EventDraft.
 */
export interface AttendeeDraft {
  name: string
  company: string
}

export interface Rsvp {
  id: string
  eventId: string
  attendeeId: string
  createdAt: string
  anonymous: boolean
}

/**
 * The attending list is GROUPED, not ranked (DESIGN.md #16).
 *
 * A single ranked list forced two separate rules — one for ordering, one for
 * the per-person label — and they disagreed: someone sharing two sessions
 * could rank below someone sharing one. Grouping makes the section header the
 * explanation, so ordering and reason cannot diverge. Each person lands in
 * exactly one group: their strongest overlap.
 */
export type OverlapKind = 'session' | 'interest' | 'company' | 'none'

export interface CoAttendee {
  attendee: Attendee
  /** The specific shared thing, e.g. "Both in Scaling Inference on a Budget".
   *  Null where the section header already says everything (DESIGN.md #17). */
  detail: string | null
}

export interface AttendingGroup {
  kind: OverlapKind
  label: string
  people: CoAttendee[]
}

/**
 * Reciprocity-gated: you cannot see who is going until you have RSVP'd
 * yourself (DESIGN.md #9). Modelling it as a discriminated union means the UI
 * physically cannot render names without passing the gate.
 */
export type AttendingList =
  | { gated: true; goingCount: number }
  | {
      gated: false
      goingCount: number
      anonymousCount: number
      groups: AttendingGroup[]
    }
