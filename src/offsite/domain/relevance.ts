import type { Attendee, AttendingGroup, CoAttendee, OverlapKind } from './types'

/**
 * Groups co-attendees by their strongest overlap with the viewer
 * (DESIGN.md #16). Sections are ordered strongest-signal-first: sharing a
 * session means you were in a room together today, which is the easiest
 * conversation opener there is.
 *
 * There is deliberately no score. A single ranked list needed one rule to
 * order and another to explain, and the two drifted apart. The header is now
 * the explanation, so they cannot.
 */

const SECTION_ORDER: OverlapKind[] = ['session', 'interest', 'company', 'none']

const SECTION_LABELS: Record<OverlapKind, string> = {
  session: 'In your sessions',
  interest: 'Shared interests',
  company: 'From your company',
  none: 'Also attending',
}

export function groupCoAttendees(
  viewer: Attendee,
  others: Attendee[],
  sessionTitles: Record<string, string>,
): AttendingGroup[] {
  const buckets = new Map<OverlapKind, CoAttendee[]>()

  for (const attendee of others) {
    if (attendee.id === viewer.id) continue
    const { kind, detail } = classify(viewer, attendee, sessionTitles)
    const bucket = buckets.get(kind) ?? []
    bucket.push({ attendee, detail })
    buckets.set(kind, bucket)
  }

  return SECTION_ORDER.filter((kind) => buckets.get(kind)?.length).map((kind) => ({
    kind,
    label: SECTION_LABELS[kind],
    people: buckets.get(kind)!,
  }))
}

function classify(
  viewer: Attendee,
  attendee: Attendee,
  sessionTitles: Record<string, string>,
): { kind: OverlapKind; detail: string | null } {
  const sharedSessions = attendee.sessionIds.filter((id) => viewer.sessionIds.includes(id))
  if (sharedSessions.length > 0) {
    return { kind: 'session', detail: sessionDetail(sharedSessions, sessionTitles) }
  }

  const sharedInterests = attendee.interests.filter((i) => viewer.interests.includes(i))
  if (sharedInterests.length > 0) {
    return { kind: 'interest', detail: `Also into ${sharedInterests.join(' and ')}` }
  }

  // No detail — the section header already says it.
  if (attendee.company === viewer.company) return { kind: 'company', detail: null }

  return { kind: 'none', detail: null }
}

function sessionDetail(sharedSessions: string[], titles: Record<string, string>): string {
  const named = sharedSessions.map((id) => titles[id]).filter(Boolean)
  if (named.length === 0) return 'In one of your sessions'
  if (named.length === 1) return `Both in ${named[0]}`
  return `Both in ${named[0]} +${named.length - 1} more`
}
