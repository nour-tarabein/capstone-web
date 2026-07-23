import { useMemo } from 'react';
import {
  mdiAccountGroupOutline,
  mdiCalendarCheck,
  mdiCalendarPlus,
  mdiMapMarkerOutline,
} from '@mdi/js';
import { attendees } from '../offsite/fixtures/attendees';
import { useViewerId } from '../offsite/persona';
import { initials } from '../offsite/format';
import {
  sessionDescriptions,
  sessionGuide,
  scheduleDays,
  speakersBySession,
} from '../data/mock';
import { isOnSchedule, toggleSession, useScheduleVersion } from '../myschedule';
import { toast } from '../ui/toast';
import { Icon } from '../icons';
import { colors } from '../theme';

export function SessionSheet({ sessionId }: { sessionId: string }) {
  const viewerId = useViewerId();
  useScheduleVersion();

  const session = sessionGuide.find((s) => s.id === sessionId);
  const speaker = speakersBySession.get(sessionId);
  const dayLabel = scheduleDays.find((d) => d.night === session?.day)?.label;

  // Roster-registered count — the same fixture data the attending list uses.
  const registered = useMemo(
    () => attendees.filter((a) => a.sessionIds.includes(sessionId)).length,
    [sessionId],
  );

  if (!session) return null;
  const onSchedule = isOnSchedule(viewerId, session.id);

  function toggle() {
    if (!session) return;
    const nowOn = toggleSession(viewerId, session.id);
    toast(nowOn ? 'Added to your schedule' : 'Removed from your schedule');
  }

  return (
    <div className="session-sheet">
      <div className="sheet-head">
        {session.official ? (
          <span className="official-badge">Official</span>
        ) : session.track ? (
          <span className="track-chip">{session.track}</span>
        ) : null}
        <span className="sheet-time">
          {dayLabel} · {session.time}
        </span>
      </div>

      <div className="sheet-title">{session.title}</div>
      <div className="sheet-meta">
        <Icon path={mdiMapMarkerOutline} size={14} color={colors.textSecondary} />{' '}
        {session.room}
      </div>

      {sessionDescriptions[session.id] ? (
        <p className="sheet-description">{sessionDescriptions[session.id]}</p>
      ) : null}

      {speaker ? (
        <div className="speaker-card">
          <span className="person-avatar person-avatar-lg">
            {initials(speaker.name)}
          </span>
          <span className="person-body">
            <span className="person-name">{speaker.name}</span>
            <span className="person-title">
              {speaker.title} · {speaker.company}
            </span>
          </span>
        </div>
      ) : null}

      {registered > 0 ? (
        <div className="session-going-row">
          <Icon path={mdiAccountGroupOutline} size={16} color={colors.green} />
          {registered} from the roster registered
        </div>
      ) : null}

      {session.official ? (
        <p className="gate-copy">
          Official events are on everyone&apos;s schedule automatically.
        </p>
      ) : (
        <button
          className={onSchedule ? 'rsvp-button rsvp-going' : 'rsvp-button'}
          onClick={toggle}
        >
          <Icon
            path={onSchedule ? mdiCalendarCheck : mdiCalendarPlus}
            size={17}
            color={onSchedule ? colors.green : colors.textDark}
          />
          {onSchedule ? 'On my schedule' : 'Add to my schedule'}
        </button>
      )}
    </div>
  );
}
