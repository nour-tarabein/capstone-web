import { createClient } from '@supabase/supabase-js'
import type {
  AttendingList,
  Attendee,
  Conference,
  CurationStatus,
  EventDraft,
  OffsiteEvent,
  PendingEvent,
} from '../domain/types'
import { groupCoAttendees } from '../domain/relevance'
import type { Repository } from './repository'
import { getViewerId } from '../persona'
import { sessionTitles } from '../fixtures/sessions'
import { attendeesById } from '../fixtures/attendees'
import { conference as fixtureConference } from '../fixtures/conference'
import { supabaseAnonKey, supabaseUrl } from './env'

/**
 * Live repository. Events and the roster are pre-seeded rows (no third-party
 * API risk on demo day); RSVPs are genuinely live and multi-device, which is
 * what makes the two-phone moment possible (DESIGN.md #11).
 *
 * The reciprocity gate is NOT enforced here — it is enforced in Postgres, by
 * the attending_list() function in supabase/schema.sql. This client cannot
 * read rsvp rows for other people at all; RLS refuses. That is deliberate: a
 * gate that only exists in the client is not a gate (DESIGN.md #9).
 */
export function createSupabaseRepository(): Repository {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    // No auth in the POC — personas are switched in-app, so skip session
    // persistence entirely.
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return {
    async getConference(): Promise<Conference> {
      const { data } = await client.from('conferences').select('*').single()
      return toConference(data)
    },

    async getViewer(): Promise<Attendee> {
      const id = getViewerId()
      const { data, error } = await client
        .from('attendees')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (data && !error) return toAttendee(data)
      // Roster can lag fixtures after a local rewrite — prefer the fixture so
      // the UI never shows a retired fictional name (Maya / Priya).
      const local = attendeesById.get(id)
      if (local) return local
      throw error ?? new Error(`Viewer ${id} not found`)
    },

    async listEventsForNight(night: string): Promise<OffsiteEvent[]> {
      // unwrap, not a bare destructure: without it a failed query returns null
      // and the map silently renders an empty night, which is indistinguishable
      // from "no events tonight" and sends you hunting in the wrong place.
      const { data } = unwrap(
        await client
          .from('events')
          .select('*')
          .eq('curation_status', 'approved')
          .gte('starts_at', `${night}T00:00:00-05:00`)
          .lte('starts_at', `${night}T23:59:59-05:00`)
          .order('starts_at'),
      )
      if (!data?.length) {
        console.warn(
          `[offsite] no approved events for ${night}. Check the seed ran: ` +
            `select curation_status, starts_at::date, count(*) from events group by 1,2;`,
        )
      }
      return (data ?? []).map(toEvent)
    },

    async getEvent(eventId: string): Promise<OffsiteEvent | null> {
      const { data } = unwrap(
        await client.from('events').select('*').eq('id', eventId).maybeSingle(),
      )
      return data ? toEvent(data) : null
    },

    async getGoingCounts(eventIds: string[]): Promise<Record<string, number>> {
      const { data } = unwrap(await client.rpc('going_counts', { p_event_ids: eventIds }))
      const counts = Object.fromEntries(eventIds.map((id) => [id, 0]))
      for (const row of data ?? []) counts[row.event_id] = Number(row.going_count)
      return counts
    },

    async getAttendingList(eventId: string, viewerId: string): Promise<AttendingList> {
      const { data } = unwrap(
        await client.rpc('attending_list', { p_event_id: eventId, p_viewer_id: viewerId }),
      )

      if (!data || data.gated) return { gated: true, goingCount: data?.going_count ?? 0 }

      const people = (data.people ?? []).map(toAttendee)
      const viewer = await this.getViewer()

      return {
        gated: false,
        goingCount: data.going_count,
        anonymousCount: data.anonymous_count,
        groups: groupCoAttendees(viewer, people, sessionTitles),
      }
    },

    // Writes go through RPC, not the table. PostgREST returns the written row
    // by default, which would require SELECT on rsvps — and granting that
    // reopens the reverse lookup (DESIGN.md #9).
    async rsvp(eventId: string, attendeeId: string, anonymous: boolean): Promise<void> {
      unwrap(
        await client.rpc('rsvp_create', {
          p_event_id: eventId,
          p_attendee_id: attendeeId,
          p_anonymous: anonymous,
        }),
      )
    },

    async cancelRsvp(eventId: string, attendeeId: string): Promise<void> {
      unwrap(
        await client.rpc('rsvp_cancel', { p_event_id: eventId, p_attendee_id: attendeeId }),
      )
    },

    /**
     * Polls the going-count and fires onChange only when it moves.
     *
     * Not realtime, deliberately. Supabase Realtime authorises postgres_changes
     * subscribers by checking they can SELECT the affected rows — and anon has
     * no access to rsvps at all, by design (DESIGN.md #9), so nothing is ever
     * delivered. Reopening that permission to get push notifications would
     * trade the reverse-lookup guarantee for a few hundred milliseconds.
     *
     * Polling is also the more robust choice for the demo: a websocket on
     * conference wifi is a classic live-demo failure, whereas a 2.5s poll
     * degrades gracefully and retries on its own. One tiny RPC per open sheet.
     *
     * To restore true push later without weakening the gate, add a trigger on
     * rsvps that calls realtime.broadcast_changes() with event_id only — no
     * attendee identity — and subscribe to that channel instead.
     */
    subscribeToEvent(eventId: string, onChange: () => void): () => void {
      let lastCount: number | null = null
      let stopped = false

      const tick = async () => {
        if (stopped) return
        try {
          const { data } = await client.rpc('going_counts', { p_event_ids: [eventId] })
          const count = Number(data?.[0]?.going_count ?? 0)
          if (lastCount !== null && count !== lastCount) onChange()
          lastCount = count
        } catch {
          // Transient network blip — keep polling rather than dying.
        }
      }

      void tick()
      const timer = setInterval(() => void tick(), 2500)

      return () => {
        stopped = true
        clearInterval(timer)
      }
    },

    async listCurationCandidates(): Promise<OffsiteEvent[]> {
      const { data } = await client.from('events').select('*').eq('is_official', false)
      return (data ?? []).map(toEvent)
    },

    // Submissions and reviews go through RPC for the same reason RSVPs do:
    // anon has no write access to events, and the events_read policy only
    // exposes approved rows — so PostgREST could not return the written row
    // even if it were allowed to write it.
    async submitEvent(draft: EventDraft): Promise<void> {
      unwrap(
        await client.rpc('event_submit', {
          p_title: draft.title,
          p_description: draft.description,
          p_starts_at: draft.startsAt,
          p_venue_name: draft.venueName,
          p_lat: draft.lat,
          p_lng: draft.lng,
          p_attendee_id: draft.submittedByAttendeeId,
        }),
      )
    },

    /**
     * The review queue cannot be a select. The rows an organizer needs to see
     * are exactly the rows events_read hides — that policy is what makes the
     * approval gate real, so the queue is a SECURITY DEFINER function instead.
     */
    async listPendingEvents(): Promise<PendingEvent[]> {
      const { data } = unwrap(await client.rpc('pending_events'))
      return (data ?? []).map((row: any) => ({
        ...toEvent(row),
        submittedByName: row.submitted_by_name ?? null,
        submittedByCompany: row.submitted_by_company ?? null,
      }))
    },

    async reviewEvent(
      eventId: string,
      status: Extract<CurationStatus, 'approved' | 'rejected'>,
    ): Promise<void> {
      unwrap(await client.rpc('event_review', { p_event_id: eventId, p_status: status }))
    },
  }
}

/**
 * Throw on a Supabase error instead of ignoring it. Without this the client
 * swallows failures and the UI just quietly does nothing — which is how a 401
 * on the RSVP write read as "the button doesn't work" rather than "permission
 * denied". Silent failure is worse than a crash here.
 */
function unwrap<T extends { error: unknown }>(result: T): T {
  if (result.error) throw result.error
  return result
}

/* Postgres is snake_case, the domain is camelCase. Map explicitly — casting a
 * raw row to the domain type compiles and then silently yields undefined. */

function toConference(row: any): Conference {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    venueName: row.venue_name,
    venueLat: row.venue_lat,
    venueLng: row.venue_lng,
    // Demo nights live in fixtures (Thu/Fri only). Remote seed can lag.
    nights: fixtureConference.nights,
    topicTags: row.topic_tags,
  }
}

function toAttendee(row: any): Attendee {
  return {
    id: row.id,
    conferenceId: row.conference_id ?? row.conferenceId,
    name: row.name,
    title: row.title,
    company: row.company,
    photoUrl: row.photo_url ?? row.photoUrl ?? '',
    interests: row.interests ?? [],
    sessionIds: row.session_ids ?? row.sessionIds ?? [],
    directoryOptIn: row.directory_opt_in ?? row.directoryOptIn ?? true,
  }
}

function toEvent(row: any): OffsiteEvent {
  return {
    id: row.id,
    conferenceId: row.conference_id,
    source: row.source,
    sourceEventId: row.source_event_id,
    sourceUrl: row.source_url,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    venueName: row.venue_name,
    lat: row.lat,
    lng: row.lng,
    tags: row.tags ?? [],
    // NULL means "no public audience" (official / attendee-hosted), which the
    // UI renders as no line at all - distinct from a platform reporting zero.
    externalGoingCount: row.external_going_count ?? undefined,
    isOfficial: row.is_official,
    curationStatus: row.curation_status,
    curationRationale: row.curation_rationale,
    submittedByAttendeeId: row.submitted_by ?? null,
  }
}
