import { useCallback, useEffect, useState } from 'react';
import {
  mdiAccountCircleOutline,
  mdiCheckAll,
  mdiCheckCircle,
  mdiChevronLeft,
  mdiCloseCircle,
} from '@mdi/js';
import { goBack } from '../App';
import { SourceBadge } from '../components/SourceBadge';
import type { PendingEvent } from '../offsite/domain/types';
import { repository } from '../offsite/data';
import { formatTime } from '../offsite/format';
import { nightLabels } from '../offsite/fixtures/conference';
import { Icon } from '../icons';
import { colors } from '../theme';

/**
 * The organizer's side of the approval loop. One queue holds both attendee
 * submissions and ranker-surfaced third-party candidates — the reviewer's
 * question is the same either way, and the source badge says where each came
 * from.
 */
export function ReviewQueueScreen() {
  const [pending, setPending] = useState<PendingEvent[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decided, setDecided] = useState<Record<string, 'approved' | 'rejected'>>({});

  const load = useCallback(async () => {
    setPending(await repository.listPendingEvents());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(event: PendingEvent, status: 'approved' | 'rejected') {
    setBusyId(event.id);
    try {
      await repository.reviewEvent(event.id, status);
      setDecided((prev) => ({ ...prev, [event.id]: status }));
    } finally {
      setBusyId(null);
    }
  }

  const undecided = (pending ?? []).filter((e) => !decided[e.id]);

  return (
    <div className="map-screen">
      <header className="map-header">
        <button className="back-button" onClick={goBack} aria-label="Close review queue">
          <Icon path={mdiChevronLeft} size={24} color={colors.text} />
        </button>
        <div className="map-header-text">
          <div className="map-title">Review queue</div>
          <div className="map-subtitle">
            {pending === null ? 'Loading…' : `${undecided.length} awaiting a decision`}
          </div>
        </div>
        <span className="back-button" />
      </header>

      <div className="screen-scroll review-content">
        {pending !== null && pending.length === 0 ? (
          <div className="review-empty">
            <Icon path={mdiCheckAll} size={30} color={colors.textSecondary} />
            <div className="review-empty-title">Nothing to review</div>
            <p className="review-empty-body">
              Attendee submissions land here before they reach the map.
            </p>
          </div>
        ) : null}

        {(pending ?? []).map((event) => {
          const decision = decided[event.id];
          const eventNight = event.startsAt.slice(0, 10);
          return (
            <div
              key={event.id}
              className={decision ? 'review-card review-card-decided' : 'review-card'}
            >
              <div className="review-card-head">
                <SourceBadge source={event.source} />
                <span className="review-when">
                  {nightLabels[eventNight] ?? eventNight} · {formatTime(event.startsAt)}
                </span>
              </div>

              <div className="review-card-title">{event.title}</div>
              <div className="review-venue">{event.venueName}</div>

              {event.description ? (
                <p className="review-description">{event.description}</p>
              ) : null}

              {/* Attendee submissions name their host; ranker-surfaced
                  candidates carry the ranker's rationale instead. */}
              {event.submittedByName ? (
                <div className="host-row">
                  <Icon path={mdiAccountCircleOutline} size={16} color={colors.green} />
                  <span className="host-name">
                    {event.submittedByName}
                    {event.submittedByCompany ? ` · ${event.submittedByCompany}` : ''}
                  </span>
                </div>
              ) : event.curationRationale ? (
                <div className="rationale">{event.curationRationale}</div>
              ) : null}

              {decision ? (
                <div className="decided-row">
                  <Icon
                    path={decision === 'approved' ? mdiCheckCircle : mdiCloseCircle}
                    size={17}
                    color={decision === 'approved' ? colors.green : colors.textSecondary}
                  />
                  <span
                    className={
                      decision === 'approved'
                        ? 'decided-text decided-approved'
                        : 'decided-text'
                    }
                  >
                    {decision === 'approved'
                      ? 'Approved — now live on the map'
                      : 'Rejected — stays hidden'}
                  </span>
                </div>
              ) : (
                <div className="actions-row">
                  <button
                    className="action-reject"
                    disabled={busyId === event.id}
                    onClick={() => void review(event, 'rejected')}
                  >
                    Reject
                  </button>
                  <button
                    className="action-approve"
                    disabled={busyId === event.id}
                    onClick={() => void review(event, 'approved')}
                  >
                    {busyId === event.id ? '…' : 'Approve'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
