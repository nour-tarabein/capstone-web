import type {
  AttendingList,
  Attendee,
  Conference,
  CurationStatus,
  EventDraft,
  OffsiteEvent,
  PendingEvent,
  Rsvp,
} from '../domain/types'
import { groupCoAttendees } from '../domain/relevance'
import type { Repository } from './repository'
import { conference } from '../fixtures/conference'
import { sessionTitles } from '../fixtures/sessions'
import { attendees, attendeesById } from '../fixtures/attendees'
import { getViewerId } from '../persona'
import { events, pendingSubmissions, rejectedCandidates } from '../fixtures/events'
import { rsvps as seedRsvps } from '../fixtures/rsvps'

/**
 * Fixture-backed repository. Runs the identical UI with zero network — the
 * demo-day fallback when venue wifi fails (DESIGN.md #11). Mutations live in
 * memory and notify subscribers, so single-device RSVP flows still feel live;
 * only the two-phone moment needs Supabase.
 */
export function createMockRepository(): Repository {
  const rsvps: Rsvp[] = [...seedRsvps]
  const listeners = new Map<string, Set<() => void>>()

  // A mutable copy, not the imported fixture array. Submissions append here and
  // approvals mutate here, so the offline demo can run the whole
  // submit → approve → appears-on-the-map loop without a network.
  const allEvents: OffsiteEvent[] = [...events, ...pendingSubmissions, ...rejectedCandidates]
  let submissionSeq = 0

  const notify = (eventId: string) => listeners.get(eventId)?.forEach((fn) => fn())
  const goingFor = (eventId: string) => rsvps.filter((r) => r.eventId === eventId)

  return {
    async getConference(): Promise<Conference> {
      return conference
    },

    async getViewer(): Promise<Attendee> {
      return attendeesById.get(getViewerId())!
    },

    async listEventsForNight(night: string): Promise<OffsiteEvent[]> {
      return allEvents
        .filter((e) => e.curationStatus === 'approved' && e.startsAt.slice(0, 10) === night)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    },

    async getEvent(eventId: string): Promise<OffsiteEvent | null> {
      return allEvents.find((e) => e.id === eventId) ?? null
    },

    async getGoingCounts(eventIds: string[]): Promise<Record<string, number>> {
      return Object.fromEntries(eventIds.map((id) => [id, goingFor(id).length]))
    },

    async getAttendingList(eventId: string, viewerId: string): Promise<AttendingList> {
      const going = goingFor(eventId)
      const goingCount = going.length

      // The gate: no names until you have committed to attend (DESIGN.md #9).
      const viewerIsGoing = going.some((r) => r.attendeeId === viewerId)
      if (!viewerIsGoing) return { gated: true, goingCount }

      // Named only if BOTH the directory opt-in and this RSVP allow it (DESIGN.md #3).
      const nameable = going
        .filter((r) => !r.anonymous && r.attendeeId !== viewerId)
        .map((r) => attendeesById.get(r.attendeeId))
        .filter((a): a is Attendee => !!a && a.directoryOptIn)

      const viewer = attendeesById.get(viewerId)!
      return {
        gated: false,
        goingCount,
        anonymousCount: goingCount - nameable.length - 1,
        groups: groupCoAttendees(viewer, nameable, sessionTitles),
      }
    },

    async rsvp(eventId: string, attendeeId: string, anonymous: boolean): Promise<void> {
      if (rsvps.some((r) => r.eventId === eventId && r.attendeeId === attendeeId)) return
      rsvps.push({
        id: `${eventId}::${attendeeId}`,
        eventId,
        attendeeId,
        createdAt: new Date().toISOString(),
        anonymous,
      })
      notify(eventId)
    },

    async cancelRsvp(eventId: string, attendeeId: string): Promise<void> {
      const i = rsvps.findIndex((r) => r.eventId === eventId && r.attendeeId === attendeeId)
      if (i >= 0) rsvps.splice(i, 1)
      notify(eventId)
    },

    subscribeToEvent(eventId: string, onChange: () => void): () => void {
      const set = listeners.get(eventId) ?? new Set()
      set.add(onChange)
      listeners.set(eventId, set)
      return () => set.delete(onChange)
    },

    async listCurationCandidates(): Promise<OffsiteEvent[]> {
      return allEvents.filter((e) => !e.isOfficial)
    },

    async submitEvent(draft: EventDraft): Promise<void> {
      // Mirrors event_submit() in supabase/schema.sql: the caller supplies only
      // content, and everything the organizer controls is assigned here. There
      // is deliberately no way to pass curationStatus.
      allEvents.push({
        id: `attendee:local-${++submissionSeq}`,
        conferenceId: conference.id,
        source: 'attendee',
        sourceEventId: `local-${submissionSeq}`,
        sourceUrl: '',
        title: draft.title.trim(),
        description: draft.description,
        startsAt: draft.startsAt,
        endsAt: null,
        venueName: draft.venueName.trim() || 'Location shared on approval',
        lat: draft.lat,
        lng: draft.lng,
        tags: [],
        isOfficial: false,
        curationStatus: 'candidate',
        curationRationale: 'Submitted by an attendee',
        submittedByAttendeeId: draft.submittedByAttendeeId,
      })
    },

    async listPendingEvents(): Promise<PendingEvent[]> {
      return allEvents
        .filter((e) => e.curationStatus === 'candidate')
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((e) => {
          const host = e.submittedByAttendeeId
            ? attendeesById.get(e.submittedByAttendeeId)
            : undefined
          return {
            ...e,
            submittedByName: host?.name ?? null,
            submittedByCompany: host?.company ?? null,
          }
        })
    },

    async reviewEvent(
      eventId: string,
      status: Extract<CurationStatus, 'approved' | 'rejected'>,
    ): Promise<void> {
      const event = allEvents.find((e) => e.id === eventId)
      if (event) event.curationStatus = status
    },
  }
}

export { attendees }
