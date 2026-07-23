import { useMemo, useState } from 'react';
import {
  mdiChevronDown,
  mdiChevronUp,
  mdiMapMarkerOutline,
  mdiStarFourPoints,
} from '@mdi/js';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  scheduleCategories,
  scheduleDays,
  scheduleTabs,
  sessionGuide,
} from '../data/mock';
import { attendeesById } from '../offsite/fixtures/attendees';
import { useViewerId } from '../offsite/persona';
import { Icon } from '../icons';
import { colors } from '../theme';

export function ScheduleScreen() {
  const [activeTab, setActiveTab] = useState<(typeof scheduleTabs)[number]>(
    'Session Guide',
  );
  const [activeDay, setActiveDay] = useState(scheduleDays[0].night);
  const [activeCategory, setActiveCategory] = useState('All Sessions');
  const [promoOpen, setPromoOpen] = useState(true);
  const viewer = attendeesById.get(useViewerId());

  const sessions = useMemo(() => {
    let list = sessionGuide.filter((s) => s.day === activeDay);
    if (activeTab === 'My Schedule') {
      // Registered sessions come from the persona; official evening events
      // are on everyone's schedule, same as their pre-seeded RSVPs.
      list = list.filter((s) => s.official || viewer?.sessionIds.includes(s.id));
    } else if (activeTab === 'Recommended') {
      list = list.filter(
        (s) =>
          s.track !== undefined &&
          viewer !== undefined &&
          viewer.interests.includes(s.track) &&
          !viewer.sessionIds.includes(s.id),
      );
    }
    if (activeCategory !== 'All Sessions') {
      list = list.filter((s) => s.track === activeCategory);
    }
    return list;
  }, [activeTab, activeDay, activeCategory, viewer]);

  return (
    <div className="screen">
      <ScreenHeader title="Schedule" showSearch />

      <div className="top-tabs">
        {scheduleTabs.map((tab) => (
          <button
            key={tab}
            className={tab === activeTab ? 'top-tab top-tab-active' : 'top-tab'}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === activeTab ? <span className="top-tab-underline" /> : null}
          </button>
        ))}
      </div>

      <div className="screen-scroll schedule-content">
        {promoOpen ? (
          <div className="promo-card">
            <div className="promo-top">
              <Icon path={mdiStarFourPoints} size={18} color={colors.text} />
              <button
                className="icon-button"
                onClick={() => setPromoOpen(false)}
                aria-label="Collapse"
              >
                <Icon path={mdiChevronUp} size={20} color={colors.text} />
              </button>
            </div>
            <div className="promo-title">Get the most out of your schedule</div>
            <div className="promo-body">
              Use AI to find sessions you might like based on your profile,
              interests, and activity.
            </div>
            <button className="promo-cta" onClick={() => setActiveTab('Recommended')}>
              Get recommendations
            </button>
          </div>
        ) : (
          <button className="promo-collapsed" onClick={() => setPromoOpen(true)}>
            <span className="promo-cta-inline">Get recommendations</span>
            <Icon path={mdiChevronDown} size={18} color={colors.green} />
          </button>
        )}

        <div className="day-row">
          {scheduleDays.map((day) => (
            <button
              key={day.night}
              className={
                day.night === activeDay ? 'day-chip day-chip-active' : 'day-chip'
              }
              onClick={() => setActiveDay(day.night)}
            >
              {day.label}
            </button>
          ))}
        </div>

        <div className="category-row">
          {scheduleCategories.map((category) => (
            <button
              key={category}
              className={
                category === activeCategory
                  ? 'category-chip category-chip-active'
                  : 'category-chip'
              }
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {sessions.length === 0 ? (
          <p className="empty-text">No sessions here — try another day or track.</p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="session-card">
              <div className="session-top">
                <span className="session-time">{session.time}</span>
                {session.official ? (
                  <span className="official-badge">Official</span>
                ) : session.track ? (
                  <span className="track-chip">{session.track}</span>
                ) : null}
              </div>
              <div className="session-title">{session.title}</div>
              <div className="session-meta-row">
                <Icon path={mdiMapMarkerOutline} size={14} color={colors.textSecondary} />
                <span className="session-room">{session.room}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
