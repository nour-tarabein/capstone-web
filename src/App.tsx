import { useEffect, useState } from 'react';
import {
  mdiAccountCircleOutline,
  mdiCardAccountDetailsOutline,
  mdiCalendarBlankOutline,
  mdiHomeOutline,
  mdiMenu,
} from '@mdi/js';
import { Icon } from './icons';
import { colors } from './theme';
import { HomeScreen } from './screens/Home';
import { ScheduleScreen } from './screens/Schedule';
import { ExhibitorsScreen } from './screens/Exhibitors';
import { MoreScreen } from './screens/More';
import { MyEventScreen } from './screens/MyEvent';
import { MapScreen } from './screens/MapScreen';
import { ReviewQueueScreen } from './screens/ReviewQueue';

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
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route === 'map') {
    return (
      <div className="shell">
        <MapScreen />
      </div>
    );
  }

  if (route === 'review') {
    return (
      <div className="shell">
        <ReviewQueueScreen />
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="screen-area">
        {tab === 'home' ? <HomeScreen onShowSchedule={() => setTab('schedule')} /> : null}
        {tab === 'schedule' ? <ScheduleScreen /> : null}
        {tab === 'exhibitors' ? <ExhibitorsScreen /> : null}
        {tab === 'more' ? <MoreScreen /> : null}
        {tab === 'myevent' ? <MyEventScreen /> : null}
      </div>

      <nav className="tab-bar">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              className="tab-button"
              onClick={() => setTab(t.id)}
              aria-label={t.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className={active ? 'tab-active-bar' : 'tab-active-bar tab-active-bar-hidden'} />
              <span className="tab-icon-wrap">
                <Icon path={t.icon} size={26} color={colors.green} />
                {t.dot ? <span className="tab-dot" /> : null}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
