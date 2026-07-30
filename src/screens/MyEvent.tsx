import { mdiBellOutline, mdiMapOutline, mdiQrcode } from '@mdi/js';
import { ScreenHeader } from '../components/ScreenHeader';
import { useViewer } from '../offsite/viewerResolution';
import { initials } from '../offsite/format';
import { sessionGuide, unreadUpdateCount, updates } from '../data/mock';
import { openMap } from '../App';
import { openOverlay } from '../overlays';
import { Icon } from '../icons';
import { colors } from '../theme';
import { LiquidButton } from '../components/LiquidButton';

export function MyEventScreen() {
  // Same persona the offsite map uses, so switching there follows here too.
  const viewer = useViewer();
  // "Now" is day 1 (Thu) mid-afternoon, so the next official thing is the
  // sponsor happy hour at 5.
  const upNext = sessionGuide.find((s) => s.id === 'happy-hour');
  const latest = updates[0];

  return (
    <div className="screen">
      <ScreenHeader title="My Event" />

      <div className="screen-scroll myevent-content">
        <LiquidButton
          className="profile-card"
          onClick={() =>
            viewer && openOverlay({ kind: 'profile', attendeeId: viewer.id })
          }
        >
          <span className="avatar-wrap">
            <span className="avatar avatar-initials">
              {viewer ? initials(viewer.name) : '?'}
            </span>
            <span
              role="button"
              tabIndex={0}
              className="qr-badge"
              aria-label="Show my badge"
              onClick={(e) => {
                e.stopPropagation();
                openOverlay({ kind: 'badge' });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  openOverlay({ kind: 'badge' });
                }
              }}
            >
              <Icon path={mdiQrcode} size={14} color={colors.text} />
            </span>
          </span>
          <span>
            <span className="profile-name">{viewer?.name ?? 'Attendee'}</span>
            <span className="profile-link">View profile</span>
          </span>
        </LiquidButton>

        <div className="myevent-section-header">
          <span className="myevent-section-title">My updates</span>
          <span className="count-badge">{unreadUpdateCount}</span>
        </div>

        <LiquidButton className="update-card" onClick={() => openOverlay({ kind: 'updates' })}>
          <Icon path={mdiBellOutline} size={22} color={colors.green} />
          <span className="update-text">
            <strong>{latest.title} </strong>
            {latest.body.slice(0, 92)}…
          </span>
        </LiquidButton>
        <LiquidButton className="view-all" onClick={() => openOverlay({ kind: 'updates' })}>
          View all
        </LiquidButton>

        <div className="myevent-section-title myevent-afternoon">My afternoon</div>

        <div className="timeline-row">
          <div className="timeline-col">
            <span className="timeline-dot timeline-dot-pulse" />
            <span className="timeline-line" />
          </div>
          <div className="timeline-body">
            <div className="happening-now">Happening now</div>
            <div className="free-time-card">
              <div className="time-range">2:15 PM – 5:00 PM (2h 45m)</div>
              <div className="free-time-title">You have free time</div>
              <LiquidButton className="free-time-cta" onClick={openMap}>
                <Icon path={mdiMapOutline} size={16} color={colors.green} />
                Plan tonight on the map
              </LiquidButton>
            </div>
          </div>
        </div>

        {upNext ? (
          <div className="timeline-row">
            <div className="timeline-col">
              <span className="timeline-dot timeline-dot-hollow" />
            </div>
            <div className="timeline-body">
              <div className="happening-now happening-next">Up next · 5:00 PM</div>
              <LiquidButton
                className="session-card timeline-session"
                onClick={() =>
                  openOverlay({ kind: 'session', sessionId: upNext.id })
                }
              >
                <span className="session-top">
                  <span className="session-time">{upNext.time}</span>
                  <span className="official-badge">Official</span>
                </span>
                <span className="session-title">{upNext.title}</span>
                <span className="session-meta-row">
                  <span className="session-room">{upNext.room}</span>
                </span>
              </LiquidButton>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
