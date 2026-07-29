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
import { conference, tysonsConference } from '../fixtures/conference'
import { sessionTitles } from '../fixtures/sessions'
import { attendees, attendeesById } from '../fixtures/attendees'
import { tysonsAttendeesById } from '../fixtures/attendeesTysons'
import { getViewerId } from '../persona'
import { events, pendingSubmissions, rejectedCandidates } from '../fixtures/events'
import {
  tysonsEvents,
  tysonsPendingSubmissions,
  tysonsRejectedCandidates,
} from '../fixtures/eventsTysons'
import { rsvps as seedRsvps } from '../fixtures/rsvps'
import { tysonsRsvps as seedTysonsRsvps } from '../fixtures/rsvpsTysons'

/** Per-conference slice of mutable state. One of these per known conference id. */
interface ConferenceBundle {
  conference: Conference
  attendeesById: Map<string, Attendee>
  // A mutable copy, not the imported fixture array. Submissions append here and
  // approvals mutate here, so the offline demo can run the whole
  // submit → approve → appears-on-the-map loop without a network.
  events: OffsiteEvent[]
  rsvps: Rsvp[]
}

function buildBundle(
  conf: Conference,
  attendeesById_: Map<string, Attendee>,
  seedEvents: OffsiteEvent[],
  rsvpSeed: Rsvp[],
): ConferenceBundle {
  return {
    conference: conf,
    attendeesById: attendeesById_,
    events: [...seedEvents],
    rsvps: [...rsvpSeed],
  }
}

/**
 * Fixture-backed repository. Runs the identical UI with zero network — the
 * demo-day fallback when venue wifi fails (DESIGN.md #11). Mutations live in
 * memory and notify subscribers, so single-device RSVP flows still feel live;
 * only the two-phone moment needs Supabase.
 *
 * Every method takes a conference id and reads/writes only that conference's
 * bundle, so two conferences running in the same tab (or the same test file)
 * never see each other's data (issue #3).
 */
export function createMockRepository(): Repository {
  const bundles = new Map<string, ConferenceBundle>([
    [
      conference.id,
      buildBundle(
        conference,
        attendeesById,
        [...events, ...pendingSubmissions, ...rejectedCandidates],
        seedRsvps,
      ),
    ],
    [
      tysonsConference.id,
      buildBundle(
        tysonsConference,
        tysonsAttendeesById,
        [...tysonsEvents, ...tysonsPendingSubmissions, ...tysonsRejectedCandidates],
        seedTysonsRsvps,
      ),
    ],
  ])
  let submissionSeq = 0

  const listeners = new Map<string, Set<() => void>>()
  const notify = (conferenceId: string, eventId: string) =>
    listeners.get(`${conferenceId}::${eventId}`)?.forEach((fn) => fn())

  function bundleFor(conferenceId: string): ConferenceBundle {
    const bundle = bundles.get(conferenceId)
    if (!bundle) throw new Error(`Unknown conference: ${conferenceId}`)
    return bundle
  }

  function goingFor(conferenceId: string, eventId: string): Rsvp[] {
    return bundleFor(conferenceId).rsvps.filter((r) => r.eventId === eventId)
  }

  return {
    async getConference(conferenceId: string): Promise<Conference> {
      return bundleFor(conferenceId).conference
    },

    async getViewer(conferenceId: string): Promise<Attendee> {
      const viewerId = getViewerId()
      const viewer = bundleFor(conferenceId).attendeesById.get(viewerId)
      if (!viewer) throw new Error(`Attendee ${viewerId} not found in conference ${conferenceId}`)
      return viewer
    },

    async listEventsForNight(conferenceId: string, night: string): Promise<OffsiteEvent[]> {
      return bundleFor(conferenceId)
        .events.filter((e) => e.curationStatus === 'approved' && e.startsAt.slice(0, 10) === night)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    },

    async getEvent(conferenceId: string, eventId: string): Promise<OffsiteEvent | null> {
      return bundleFor(conferenceId).events.find((e) => e.id === eventId) ?? null
    },

    async getGoingCounts(
      conferenceId: string,
      eventIds: string[],
    ): Promise<Record<string, number>> {
      return Object.fromEntries(eventIds.map((id) => [id, goingFor(conferenceId, id).length]))
    },

    async getAttendingList(
      conferenceId: string,
      eventId: string,
      viewerId: string,
    ): Promise<AttendingList> {
      const bundle = bundleFor(conferenceId)
      const going = goingFor(conferenceId, eventId)
      const goingCount = going.length

      // The gate: no names until you have committed to attend (DESIGN.md #9).
      const viewerIsGoing = going.some((r) => r.attendeeId === viewerId)
      if (!viewerIsGoing) return { gated: true, goingCount }

      // Named only if BOTH the directory opt-in and this RSVP allow it (DESIGN.md #3).
      const nameable = going
        .filter((r) => !r.anonymous && r.attendeeId !== viewerId)
        .map((r) => bundle.attendeesById.get(r.attendeeId))
        .filter((a): a is Attendee => !!a && a.directoryOptIn)

      const viewer = bundle.attendeesById.get(viewerId)!
      return {
        gated: false,
        goingCount,
        anonymousCount: goingCount - nameable.length - 1,
        groups: groupCoAttendees(viewer, nameable, sessionTitles),
      }
    },

    async rsvp(
      conferenceId: string,
      eventId: string,
      attendeeId: string,
      anonymous: boolean,
    ): Promise<void> {
      const bundle = bundleFor(conferenceId)
      if (bundle.rsvps.some((r) => r.eventId === eventId && r.attendeeId === attendeeId)) return
      bundle.rsvps.push({
        id: `${eventId}::${attendeeId}`,
        eventId,
        attendeeId,
        createdAt: new Date().toISOString(),
        anonymous,
      })
      notify(conferenceId, eventId)
    },

    async cancelRsvp(conferenceId: string, eventId: string, attendeeId: string): Promise<void> {
      const bundle = bundleFor(conferenceId)
      const i = bundle.rsvps.findIndex((r) => r.eventId === eventId && r.attendeeId === attendeeId)
      if (i >= 0) bundle.rsvps.splice(i, 1)
      notify(conferenceId, eventId)
    },

    subscribeToEvent(conferenceId: string, eventId: string, onChange: () => void): () => void {
      const key = `${conferenceId}::${eventId}`
      const set = listeners.get(key) ?? new Set()
      set.add(onChange)
      listeners.set(key, set)
      return () => set.delete(onChange)
    },

    async listCurationCandidates(conferenceId: string): Promise<OffsiteEvent[]> {
      return bundleFor(conferenceId).events.filter((e) => !e.isOfficial)
    },

    async submitEvent(conferenceId: string, draft: EventDraft): Promise<void> {
      const bundle = bundleFor(conferenceId)
      // Mirrors event_submit() in supabase/schema.sql: the caller supplies only
      // content, and everything the organizer controls is assigned here. There
      // is deliberately no way to pass curationStatus.
      bundle.events.push({
        id: `attendee:local-${++submissionSeq}`,
        conferenceId,
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

    async listPendingEvents(conferenceId: string): Promise<PendingEvent[]> {
      const bundle = bundleFor(conferenceId)
      return bundle.events
        .filter((e) => e.curationStatus === 'candidate')
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((e) => {
          const host = e.submittedByAttendeeId
            ? bundle.attendeesById.get(e.submittedByAttendeeId)
            : undefined
          return {
            ...e,
            submittedByName: host?.name ?? null,
            submittedByCompany: host?.company ?? null,
          }
        })
    },

    async reviewEvent(
      conferenceId: string,
      eventId: string,
      status: Extract<CurationStatus, 'approved' | 'rejected'>,
    ): Promise<void> {
      const event = bundleFor(conferenceId).events.find((e) => e.id === eventId)
      if (event) event.curationStatus = status
    },
  }
}

export { attendees }
