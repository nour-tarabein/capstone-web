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
import { OverlayHost } from './overlays';
import { Toaster } from './ui/toast';

/**
 * Hash-based routing so the browser back button works on the overlay screens
 * (map, review queue) — on a phone that back gesture is muscle memory, and a
 * purely state-based overlay would make it close the whole site instead.
 */
type Route = 'tabs' | 'map' | 'review';

function parseRoute(): Route {
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

  useEffect(() => {
    switchTab = setTab;
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
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

      <OverlayHost />
      <Toaster />
    </div>
  );
}
