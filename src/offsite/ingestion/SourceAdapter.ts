import type { EventSource, OffsiteEvent, SourceStatus } from '../domain/types'

/**
 * One interface, three implementations (DESIGN.md #14).
 *
 * Eventbrite runs against the real public API. Luma and Partiful have no
 * usable public read API, so their adapters read hand-collected data in the
 * identical shape. That gap is stated honestly per source rather than papered
 * over — `status` exists so the UI and the deck can say which is which.
 */
export interface SourceAdapter {
  source: EventSource
  status: SourceStatus
  /** What we tell the audience about this integration, verbatim. */
  statusNote: string
  /**
   * Fetch raw candidates near a point. Curation happens downstream in
   * curate.ts — adapters ingest broadly and filter nothing.
   */
  fetchCandidates(params: FetchParams): Promise<RawEvent[]>
}

export interface FetchParams {
  lat: number
  lng: number
  radiusMiles: number
  /** ISO dates bounding the conference. */
  startsAfter: string
  startsBefore: string
}

/** An event as it exists at the source, before normalisation and curation. */
export type RawEvent = Omit<
  OffsiteEvent,
  | 'id'
  | 'conferenceId'
  | 'isOfficial'
  | 'curationStatus'
  | 'curationRationale'
  // A scraped event has no submitter — only attendee-proposed ones do.
  | 'submittedByAttendeeId'
>
