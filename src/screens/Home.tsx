import { mdiChevronRight, mdiMapOutline } from '@mdi/js';
import heroBanner from '../assets/hero-banner.jpg';
import { ScreenHeader } from '../components/ScreenHeader';
import { goToTab, openMap } from '../App';
import { homeActions, sessionGuide } from '../data/mock';
import { useActiveRoster } from '../offsite/roster';
import { openOverlay, type Overlay } from '../overlays';
import { Icon } from '../icons';
import { colors } from '../theme';

/** Where each quick tile goes. Tiles without a screen of their own open the
 *  matching sheet, so every tap on the grid lands somewhere real. */
const TILE_TARGETS: Record<string, () => void> = {
  speakers: () => openOverlay({ kind: 'speakers' }),
  attendees: () => openOverlay({ kind: 'attendees' }),
  onDemand: () => openOverlay({ kind: 'ondemand' }),
  exhibitors: () => goToTab('exhibitors'),
  sponsors: () => openOverlay({ kind: 'sponsors' }),
  games: () => openOverlay({ kind: 'games' }),
};

export function HomeScreen() {
  const sessionCount = sessionGuide.filter((s) => !s.official).length;
  const { attendees } = useActiveRoster();

  return (
    <div className="screen home-screen">
      <ScreenHeader
        showSearch
        center={
          <div className="brand-block">
            <span className="brand-logo">Capstone Demo</span>
            <span className="brand-event-title">Lonestar Tech Summit 2026</span>
          </div>
        }
      />

      <div className="screen-scroll home-content">
        <div className="hero-wrap">
          <img src={heroBanner} alt="Austin skyline at dusk" className="hero-image" />
          <span className="hero-shade" />
          <span className="live-pill">
            <span className="live-dot" />
            Day 1 · Live
          </span>
          <span className="hero-date">Jul 30–31 · Austin, TX</span>
        </div>

        <div className="stat-row">
          <span className="stat-chip">
            <strong>{attendees.length * 60}+</strong> attendees
          </span>
          <span className="stat-chip">
            <strong>{sessionCount}</strong> sessions
          </span>
          <span className="stat-chip">
            <strong>2</strong> nights out
          </span>
        </div>

        <h1 className="home-welcome">Welcome to Lonestar Tech Summit 2026</h1>
        <p className="home-body">
          On your Tuesday agenda: Opening Keynote, Scaling Inference on a
          Budget, breakout sessions, and the Summit Opening Reception on the
          Terrace at 6:00 PM!
        </p>
        <button className="home-link" onClick={() => goToTab('schedule')}>
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
          {homeActions.map((action, i) => (
            <button
              key={action.id}
              className="home-tile"
              style={{ animationDelay: `${i * 45}ms` }}
              onClick={TILE_TARGETS[action.id]}
            >
              <Icon path={action.icon} size={34} color={colors.textDark} />
              <span className="home-tile-label">{action.label}</span>
            </button>
          ))}
        </div>

        <button
          className="happening-card"
          onClick={() => openOverlay({ kind: 'session', sessionId: 'reception' } satisfies Overlay)}
        >
          <span className="happening-kicker">
            <span className="live-dot" /> Up next
          </span>
          <span className="happening-title">Summit Opening Reception</span>
          <span className="happening-meta">6:00 PM · The Terrace · on everyone&apos;s schedule</span>
        </button>
      </div>
    </div>
  );
}
