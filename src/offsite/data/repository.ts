import type {
  AttendingList,
  Attendee,
  Conference,
  CurationStatus,
  EventDraft,
  OffsiteEvent,
  PendingEvent,
} from '../domain/types'

/**
 * The one interface the UI talks to. Two implementations: Supabase (live,
 * multi-device) and a fixture-backed mock selected by VITE_MOCK=1
 * (DESIGN.md #11) — the demo-day insurance policy.
 *
 * Note what is deliberately ABSENT: there is no way to list events by person —
 * not for other attendees, and not even for the viewer. Discovery is
 * event-first, never person-first: you can ask "who is at this event", never
 * "which events is Maya at" (DESIGN.md #9). Leaving the reverse lookup out of
 * the interface entirely is the cheapest way to guarantee no screen ever
 * accidentally builds one — and it means the client never needs SELECT on the
 * rsvps table at all, which is what lets RLS lock that table down completely.
 */
export interface Repository {
  getConference(): Promise<Conference>
  getViewer(): Promise<Attendee>

  /** Approved events for one night. The night selector is a hard filter (DESIGN.md #7). */
  listEventsForNight(night: string): Promise<OffsiteEvent[]>
  getEvent(eventId: string): Promise<OffsiteEvent | null>

  /**
   * Pin badge counts. Aggregate only — deliberately separate from
   * getAttendingList so the map can show "14 going" for events the viewer has
   * not RSVP'd to without any identity crossing the boundary.
   */
  getGoingCounts(eventIds: string[]): Promise<Record<string, number>>

  /**
   * Reciprocity-gated (DESIGN.md #9). Returns `{ gated: true }` with a count
   * only, unless the viewer has RSVP'd to this event themselves.
   */
  getAttendingList(eventId: string, viewerId: string): Promise<AttendingList>

  rsvp(eventId: string, attendeeId: string, anonymous: boolean): Promise<void>
  cancelRsvp(eventId: string, attendeeId: string): Promise<void>

  /** Realtime: fires when anyone RSVPs to this event. Powers the two-phone moment. */
  subscribeToEvent(eventId: string, onChange: () => void): () => void

  /** Organizer console (static for the POC) — all candidates, pre-approval. */
  listCurationCandidates(): Promise<OffsiteEvent[]>

  /**
   * An attendee proposes an event. It lands as a `candidate` and is invisible
   * to the map until an organizer approves it — enforced in Postgres by the
   * events_read RLS policy, not by this client.
   */
  submitEvent(draft: EventDraft): Promise<void>

  /**
   * The organizer review queue: everything awaiting a decision, whether an
   * attendee submitted it or the ingestion ranker surfaced it. One queue for
   * both is deliberate — the reviewer's question is the same either way, and
   * the source badge already says where each came from.
   */
  listPendingEvents(): Promise<PendingEvent[]>

  /** Approve or reject a candidate. Approving is what puts it on the map. */
  reviewEvent(eventId: string, status: Extract<CurationStatus, 'approved' | 'rejected'>): Promise<void>
}
