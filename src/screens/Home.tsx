import { mdiChevronRight, mdiMapOutline } from '@mdi/js';
import heroBanner from '../assets/hero-banner.png';
import { ScreenHeader } from '../components/ScreenHeader';
import { openMap } from '../App';
import { homeActions } from '../data/mock';
import { Icon } from '../icons';
import { colors } from '../theme';

export function HomeScreen({ onShowSchedule }: { onShowSchedule: () => void }) {
  return (
    <div className="screen home-screen">
      <ScreenHeader
        center={
          <div className="brand-block">
            <span className="brand-logo">demo</span>
            <span className="brand-event-title">Lonestar Tech Summit 2026</span>
          </div>
        }
      />

      <div className="screen-scroll home-content">
        <div className="hero-wrap">
          <img src={heroBanner} alt="Conference main stage" className="hero-image" />
          <span className="hero-rail" />
        </div>

        <h1 className="home-welcome">Welcome to Lonestar Tech Summit 2026</h1>
        <p className="home-body">
          On your Tuesday agenda: Opening Keynote, Scaling Inference on a
          Budget, breakout sessions, and the Summit Opening Reception on the
          Terrace at 6:00 PM!
        </p>
        <button className="home-link" onClick={onShowSchedule}>
          View my schedule
        </button>

        <button className="offsite-card" onClick={openMap} aria-label="Open tonight nearby map">
          <span className="offsite-icon">
            <Icon path={mdiMapOutline} size={22} color={colors.green} />
          </span>
          <span className="offsite-body">
            <span className="offsite-title">Tonight Nearby</span>
            <span className="offsite-sub">
              Dinners and meetups around the city — see who else is going
            </span>
          </span>
          <Icon path={mdiChevronRight} size={20} color={colors.textSecondary} />
        </button>

        <div className="home-grid">
          {homeActions.map((action) => (
            <button key={action.id} className="home-tile">
              <Icon path={action.icon} size={34} color={colors.textDark} />
              <span className="home-tile-label">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
