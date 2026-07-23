import { useCallback, useEffect, useState } from 'react';
import type {
  Attendee,
  AttendingList,
  Conference,
  OffsiteEvent,
} from '../offsite/domain/types';
import { repository } from '../offsite/data';
import { milesBetween } from '../offsite/ingestion/curate';
import { formatTime, sourceLabels } from '../offsite/format';
import { SourceBadge } from './SourceBadge';
import { AttendingListView } from './AttendingList';

interface Props {
  eventId: string | null;
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

  const refresh = useCallback(async () => {
    if (!eventId) return;
    const [e, a] = await Promise.all([
      repository.getEvent(eventId),
      repository.getAttendingList(eventId, viewer.id),
    ]);
    setEvent(e);
    setAttending(a);
  }, [eventId, viewer.id]);

  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      setAttending(null);
      setAnonymous(false);
      return;
    }
    void refresh();
    return repository.subscribeToEvent(eventId, () => void refresh());
  }, [eventId, refresh]);

  if (eventId === null) return null;

  const going = attending ? !attending.gated : false;

  async function toggleRsvp() {
    if (!eventId || busy) return;
    setBusy(true);
    try {
      if (going) await repository.cancelRsvp(eventId, viewer.id);
      else await repository.rsvp(eventId, viewer.id, anonymous);
      await refresh();
      onRsvpChange();
    } finally {
      setBusy(false);
    }
  }

  const miles = event
    ? milesBetween(event.lat, event.lng, conference.venueLat, conference.venueLng)
    : 0;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {!event || !attending ? (
          <div className="sheet-loader">Loading…</div>
        ) : (
          <div className="sheet-scroll">
            <div className="sheet-grabber" />

            <div className="sheet-head">
              <SourceBadge source={event.source} />
              <span className="sheet-time">{formatTime(event.startsAt)}</span>
            </div>

            <div className="sheet-title">{event.title}</div>
            <div className="sheet-meta">
              {event.venueName} · {miles.toFixed(1)} mi from {conference.venueName}
            </div>
            <p className="sheet-description">{event.description}</p>

            <button
              className={going ? 'rsvp-button rsvp-going' : 'rsvp-button'}
              onClick={() => void toggleRsvp()}
              disabled={busy}
            >
              {busy ? '…' : going ? "You're going" : "I'm going"}
            </button>

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

            {/* We hold the intent; the source platform holds the ticket (DESIGN.md #2). */}
            {event.source !== 'official' ? (
              <a
                className="handoff-link"
                href={event.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Get your ticket on {sourceLabels[event.source]} ↗
              </a>
            ) : null}

            <AttendingListView attending={attending} conference={conference} />
          </div>
        )}
      </div>
    </div>
  );
}
