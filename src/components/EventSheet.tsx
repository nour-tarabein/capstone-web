import { useCallback, useEffect, useState } from 'react';
import { mdiAccountStarOutline, mdiCheck, mdiMapMarkerOutline, mdiOpenInNew } from '@mdi/js';
import type {
  Attendee,
  AttendingList,
  Conference,
  OffsiteEvent,
} from '../offsite/domain/types';
import { repository } from '../offsite/data';
import { getRoster } from '../offsite/roster';
import { milesBetween } from '../offsite/ingestion/curate';
import { formatTime, sourceColors, sourceLabels } from '../offsite/format';
import { SourceBadge } from './SourceBadge';
import { AttendingListView } from './AttendingList';
import { Sheet } from '../ui/Sheet';
import { Burst } from '../ui/Burst';
import { Icon } from '../icons';
import { colors } from '../theme';

interface Props {
  eventId: string;
  viewer: Attendee;
  conference: Conference;
  onClose: () => void;
  onRsvpChange: () => void;
}

export function EventSheet({ eventId, viewer, conference, onClose, onRsvpChange }: Props) {
  const [event, setEvent] = useState<OffsiteEvent | null>(null);
  const [attending, setAttending] = useState<AttendingList | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  const refresh = useCallback(async () => {
    const [e, a] = await Promise.all([
      repository.getEvent(conference.id, eventId),
      repository.getAttendingList(conference.id, eventId, viewer.id),
    ]);
    setEvent(e);
    setAttending(a);
  }, [conference.id, eventId, viewer.id]);

  useEffect(() => {
    void refresh();
    return repository.subscribeToEvent(conference.id, eventId, () => void refresh());
  }, [conference.id, eventId, refresh]);

  const going = attending ? !attending.gated : false;

  async function toggleRsvp() {
    if (busy) return;
    setBusy(true);
    try {
      if (going) {
        await repository.cancelRsvp(conference.id, eventId, viewer.id);
      } else {
        await repository.rsvp(conference.id, eventId, viewer.id, anonymous);
        // The payoff moment: the gate lifts and the room appears.
        setBurstKey((k) => k + 1);
      }
      await refresh();
      onRsvpChange();
    } finally {
      setBusy(false);
    }
  }

  const miles = event
    ? milesBetween(event.lat, event.lng, conference.venueLat, conference.venueLng)
    : 0;
  const accent = event ? sourceColors[event.source] : colors.green;
  // An attendee-hosted event names its host on the card: putting your name on
  // the thing you host IS the opt-in, so there is nothing to gate here.
  const { attendeesById } = getRoster(conference.id);
  const host = event?.submittedByAttendeeId
    ? attendeesById.get(event.submittedByAttendeeId)
    : undefined;

  return (
    <Sheet onClosed={onClose}>
      {!event || !attending ? (
        <div className="sheet-skeleton">
          <span className="skeleton skeleton-chip" />
          <span className="skeleton skeleton-title" />
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-line skeleton-line-short" />
          <span className="skeleton skeleton-button" />
        </div>
      ) : (
        <div
          className="event-sheet"
          style={{ ['--source-color' as string]: accent }}
        >
          <div className="event-sheet-glow" aria-hidden="true" />

          <div className="sheet-head">
            <SourceBadge source={event.source} />
            <span className="sheet-time">{formatTime(event.startsAt)}</span>
          </div>

          <div className="sheet-title">{event.title}</div>
          <div className="sheet-meta">
            <Icon path={mdiMapMarkerOutline} size={14} color={colors.textSecondary} />
            {event.venueName}
            {miles < 0.05
              ? '' // it IS the venue — "0.0 mi from itself" reads broken
              : ` · ${miles.toFixed(1)} mi from ${conference.venueName}`}
          </div>
          {/* Platform crowd — public metadata, safe above the reciprocity gate. */}
          {event.externalGoingCount ? (
            <div className="sheet-meta sheet-external">
              {event.externalGoingCount.toLocaleString()} going on{' '}
              {sourceLabels[event.source]}
            </div>
          ) : null}
          {host ? (
            <div className="sheet-meta sheet-host">
              <Icon path={mdiAccountStarOutline} size={14} color={accent} />
              Hosted by {host.name}
              {host.title ? ` · ${host.title}` : ''}
            </div>
          ) : null}
          <p className="sheet-description">{event.description}</p>

          <div className="rsvp-wrap">
            <button
              className={going ? 'rsvp-button rsvp-going' : 'rsvp-button'}
              onClick={() => void toggleRsvp()}
              disabled={busy}
            >
              {going ? <Icon path={mdiCheck} size={17} color={colors.green} /> : null}
              {busy ? '…' : going ? "You're going" : "I'm going"}
            </button>
            {burstKey > 0 ? <Burst key={burstKey} /> : null}
          </div>

          {/* Per-RSVP anonymity: counted, never named (DESIGN.md #3). */}
          {!going ? (
            <div className="anon-row">
              <button
                role="switch"
                aria-checked={anonymous}
                aria-label="Attend anonymously"
                className={anonymous ? 'toggle toggle-dark toggle-on' : 'toggle toggle-dark'}
                onClick={() => setAnonymous(!anonymous)}
              >
                <span className="toggle-thumb" />
              </button>
              <span className="anon-label">Attend anonymously</span>
            </div>
          ) : null}

          {/* We hold the intent; the source platform holds the ticket (DESIGN.md #2).
              Official and attendee-hosted events have no external platform to
              hand off to — the RSVP above is the whole transaction. */}
          {event.source !== 'official' && event.sourceUrl ? (
            <a
              className="handoff-link"
              href={event.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Get your ticket on {sourceLabels[event.source]}
              <Icon path={mdiOpenInNew} size={13} color={colors.textSecondary} />
            </a>
          ) : null}

          <AttendingListView attending={attending} conference={conference} event={event} />
        </div>
      )}
    </Sheet>
  );
}
