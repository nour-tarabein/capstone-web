import { mdiAccount, mdiBellOutline, mdiQrcode } from '@mdi/js';
import { ScreenHeader } from '../components/ScreenHeader';
import { attendeesById } from '../offsite/fixtures/attendees';
import { useViewerId } from '../offsite/persona';
import { Icon } from '../icons';
import { colors } from '../theme';

export function MyEventScreen() {
  // Same persona the offsite map uses, so switching there follows here too.
  const viewer = attendeesById.get(useViewerId());

  return (
    <div className="screen">
      <ScreenHeader title="My Event" />

      <div className="screen-scroll myevent-content">
        <div className="profile-card">
          <div className="avatar-wrap">
            <div className="avatar">
              <Icon path={mdiAccount} size={36} color={colors.textSecondary} />
            </div>
            <div className="qr-badge">
              <Icon path={mdiQrcode} size={14} color={colors.text} />
            </div>
          </div>
          <div>
            <div className="profile-name">{viewer?.name ?? 'Attendee'}</div>
            <button className="profile-link">View profile</button>
          </div>
        </div>

        <div className="myevent-section-header">
          <span className="myevent-section-title">My updates</span>
          <span className="count-badge">2</span>
        </div>

        <div className="update-card">
          <Icon path={mdiBellOutline} size={22} color={colors.text} />
          <p className="update-text">
            <strong>Kick off the week! </strong>
            Summit Opening Reception starts at 6:00 PM! Head to the Terrace for
            great vibes, new connection...
          </p>
        </div>
        <button className="view-all">View all</button>

        <div className="myevent-section-title myevent-afternoon">My afternoon</div>

        <div className="timeline-row">
          <div className="timeline-col">
            <span className="timeline-dot" />
            <span className="timeline-line" />
          </div>
          <div className="timeline-body">
            <div className="happening-now">Happening now</div>
            <div className="free-time-card">
              <div className="time-range">2:15 PM - 5:15 PM (3 hours)</div>
              <div className="free-time-title">You have free time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
