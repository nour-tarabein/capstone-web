import { useEffect, useState } from 'react';
import {
  mdiAccountCircleOutline,
  mdiCardAccountDetailsOutline,
  mdiCalendarBlankOutline,
  mdiHomeOutline,
  mdiMenu,
} from '@mdi/js';
import { Icon } from './icons';
import { HomeScreen } from './screens/Home';
import { ScheduleScreen } from './screens/Schedule';
import { ExhibitorsScreen } from './screens/Exhibitors';
import { MoreScreen } from './screens/More';
import { MyEventScreen } from './screens/MyEvent';
import { MapScreen } from './screens/MapScreen';
import { ReviewQueueScreen } from './screens/ReviewQueue';
import { WelcomeScreen } from './screens/Welcome';
import { OverlayHost } from './overlays';
import { Toaster } from './ui/toast';
import { getActiveConferenceId, subscribeToActiveConference } from './offsite/activeConference';
import { tysonsConference } from './offsite/fixtures/conference';
import { hasCheckedIn } from './offsite/checkinStorage';
import { useLiveRosterSync } from './offsite/data';

/**
 * Hash-based routing so the browser back button works on the overlay screens
 * (map, review queue) — on a phone that back gesture is muscle memory, and a
 * purely state-based overlay would make it close the whole site instead.
 */
type Route = 'tabs' | 'map' | 'review' | 'welcome';

/**
 * Tysons Corner's first-run gate (issue #5): a browser that hasn't checked in
 * yet always lands on the welcome screen, regardless of what hash it asks
 * for — this is what makes it a real gate rather than a suggestion the
 * address bar can bypass. Austin never shows it; today's default persona
 * keeps landing on the tab stack unchanged.
 */
function needsWelcome(): boolean {
  return getActiveConferenceId() === tysonsConference.id && !hasCheckedIn(tysonsConference.id);
}

function parseRoute(): Route {
  if (needsWelcome()) return 'welcome';
  const hash = window.location.hash;
  if (hash.startsWith('#/map')) return 'map';
  if (hash.startsWith('#/review')) return 'review';
  return 'tabs';
}

export function openMap() {
  window.location.hash = '/map';
}

export function openReview() {
  window.location.hash = '/review';
}

export function goBack() {
  // Normal flow: the overlay was pushed from the tabs, so back pops to them.
  // Direct-link edge case (someone opened #/map cold): back would leave the
  // site, so rewrite the hash instead.
  if (window.history.length > 1) window.history.back();
  else window.location.hash = '';
}

export type TabId = 'home' | 'schedule' | 'exhibitors' | 'more' | 'myevent';

let switchTab: (tab: TabId) => void = () => {};

/** Lets sheets and screens jump to a tab without threading callbacks. */
export function goToTab(tab: TabId) {
  window.location.hash = '';
  switchTab(tab);
}

const TABS: Array<{ id: TabId; icon: string; label: string; dot?: boolean }> = [
  { id: 'home', icon: mdiHomeOutline, label: 'Home' },
  { id: 'schedule', icon: mdiCalendarBlankOutline, label: 'Schedule' },
  { id: 'exhibitors', icon: mdiCardAccountDetailsOutline, label: 'Exhibitors' },
  { id: 'more', icon: mdiMenu, label: 'More' },
  { id: 'myevent', icon: mdiAccountCircleOutline, label: 'My Event', dot: true },
];

export function App() {
  const [route, setRoute] = useState<Route>(parseRoute);
  const [tab, setTab] = useState<TabId>('home');

  // Keeps roster.ts's cache warm for the active conference (issue #7) — one
  // subscription for the whole app rather than every roster-reading screen
  // fetching for itself.
  useLiveRosterSync();

  useEffect(() => {
    switchTab = setTab;
    // Cosmetic: keep the address bar honest about the gate ("a new hash
    // route") even though parseRoute() enforces it independent of the hash.
    if (route === 'welcome' && !window.location.hash.startsWith('#/welcome')) {
      window.location.hash = '/welcome';
    }
    const onRouteInputChange = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onRouteInputChange);
    // The city switcher in More (issue #4) can flip the active conference to
    // Tysons mid-session, with no hashchange involved — without this the
    // welcome gate would only catch it on the next reload.
    const unsubscribe = subscribeToActiveConference(onRouteInputChange);
    return () => {
      window.removeEventListener('hashchange', onRouteInputChange);
      unsubscribe();
    };
  }, []);

  return (
    <div className="shell">
      <div className="screen-area">
        {/* Keyed so switching tabs replays the entrance animation. */}
        <div className="tab-page" key={tab}>
          {tab === 'home' ? <HomeScreen /> : null}
          {tab === 'schedule' ? <ScheduleScreen /> : null}
          {tab === 'exhibitors' ? <ExhibitorsScreen /> : null}
          {tab === 'more' ? <MoreScreen /> : null}
          {tab === 'myevent' ? <MyEventScreen /> : null}
        </div>
      </div>

      <nav className="tab-bar">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              className={active ? 'tab-button tab-button-active' : 'tab-button'}
              onClick={() => setTab(t.id)}
              aria-label={t.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="tab-icon-wrap">
                <Icon path={t.icon} size={24} color="currentColor" />
                {t.dot ? <span className="tab-dot" /> : null}
              </span>
              <span className="tab-label">{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Full-screen routes slide in over the live tabs, native-push style,
          so tab scroll positions and state survive the round trip. */}
      {route === 'map' ? (
        <div className="route-layer">
          <MapScreen />
        </div>
      ) : null}
      {route === 'review' ? (
        <div className="route-layer">
          <ReviewQueueScreen />
        </div>
      ) : null}
      {route === 'welcome' ? (
        <div className="route-layer">
          <WelcomeScreen />
        </div>
      ) : null}

      <OverlayHost />
      <Toaster />
    </div>
  );
}
