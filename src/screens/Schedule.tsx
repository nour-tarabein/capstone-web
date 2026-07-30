import { useMemo, useState } from 'react';
import {
  mdiCheck,
  mdiChevronDown,
  mdiChevronUp,
  mdiMapMarkerOutline,
  mdiPlus,
  mdiStarFourPoints,
} from '@mdi/js';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  scheduleCategories,
  scheduleDays,
  scheduleTabs,
  sessionGuide,
  speakersBySession,
} from '../data/mock';
import { isOnSchedule, toggleSession, useScheduleVersion } from '../myschedule';
import { useViewer } from '../offsite/viewerResolution';
import { openOverlay } from '../overlays';
import { toast } from '../ui/toast';
import { Icon } from '../icons';
import { colors } from '../theme';
import { LiquidButton } from '../components/LiquidButton';
import { LiquidGlass } from '../components/LiquidGlass';

export function ScheduleScreen() {
  const [activeTab, setActiveTab] = useState<(typeof scheduleTabs)[number]>(
    'Session Guide',
  );
  const [activeDay, setActiveDay] = useState(scheduleDays[0].night);
  const [activeCategory, setActiveCategory] = useState('All Sessions');
  const [promoOpen, setPromoOpen] = useState(true);
  const viewer = useViewer();
  const viewerId = viewer.id;
  const scheduleVersion = useScheduleVersion();

  const sessions = useMemo(() => {
    let list = sessionGuide.filter((s) => s.day === activeDay);
    if (activeTab === 'My Schedule') {
      // Registered sessions come from the persona plus anything added live;
      // official evening events are on everyone's schedule.
      list = list.filter((s) => s.official || isOnSchedule(viewerId, s.id));
    } else if (activeTab === 'Recommended') {
      list = list.filter(
        (s) =>
          s.track !== undefined &&
          viewer !== undefined &&
          viewer.interests.includes(s.track) &&
          !isOnSchedule(viewerId, s.id),
      );
    }
    if (activeCategory !== 'All Sessions') {
      list = list.filter((s) => s.track === activeCategory);
    }
    return list;
  }, [activeTab, activeDay, activeCategory, viewer, viewerId, scheduleVersion]);

  function quickToggle(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation();
    const nowOn = toggleSession(viewerId, sessionId);
    toast(nowOn ? 'Added to your schedule' : 'Removed from your schedule');
  }

  return (
    <div className="screen">
      <ScreenHeader title="Schedule" showSearch />

      <div className="top-tabs">
        {scheduleTabs.map((tab) => (
          <LiquidButton
            key={tab}
            className={tab === activeTab ? 'top-tab top-tab-active' : 'top-tab'}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </LiquidButton>
        ))}
      </div>

      <div className="screen-scroll schedule-content">
        {promoOpen ? (
          <div className="promo-card">
            <div className="promo-top">
              <Icon path={mdiStarFourPoints} size={18} color={colors.green} />
              <LiquidButton
                className="icon-button"
                onClick={() => setPromoOpen(false)}
                aria-label="Collapse"
              >
                <Icon path={mdiChevronUp} size={20} color={colors.text} />
              </LiquidButton>
            </div>
            <div className="promo-title">Get the most out of your schedule</div>
            <div className="promo-body">
              Use AI to find sessions you might like based on your profile,
              interests, and activity.
            </div>
            <LiquidButton className="promo-cta" onClick={() => setActiveTab('Recommended')}>
              Get recommendations
            </LiquidButton>
          </div>
        ) : (
          <LiquidButton className="promo-collapsed" onClick={() => setPromoOpen(true)}>
            <span className="promo-cta-inline">Get recommendations</span>
            <Icon path={mdiChevronDown} size={18} color={colors.green} />
          </LiquidButton>
        )}

        {/* Pinned to the top of the list. Keeps the day and track filters in
            reach while you scan, and gives the glass the one thing an in-flow
            surface never has: session cards moving behind it to refract. */}
        <div className="schedule-filters">
          <LiquidGlass className="schedule-filters-glass" frost={14} />

          <div className="day-row">
            {scheduleDays.map((day) => (
              <LiquidButton
                key={day.night}
                className={
                  day.night === activeDay ? 'day-chip day-chip-active' : 'day-chip'
                }
                onClick={() => setActiveDay(day.night)}
              >
                {day.label}
              </LiquidButton>
            ))}
          </div>

          <div className="category-row">
            {scheduleCategories.map((category) => (
              <LiquidButton
                key={category}
                className={
                  category === activeCategory
                    ? 'category-chip category-chip-active'
                    : 'category-chip'
                }
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </LiquidButton>
            ))}
          </div>
        </div>

        {sessions.length === 0 ? (
          <p className="empty-text">
            {activeTab === 'My Schedule'
              ? 'Nothing here yet — add sessions from the Session Guide.'
              : 'No sessions here — try another day or track.'}
          </p>
        ) : (
          sessions.map((session, i) => {
            const speaker = speakersBySession.get(session.id);
            const onSchedule = isOnSchedule(viewerId, session.id);
            return (
              <LiquidButton
                key={session.id}
                className="session-card"
                style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                onClick={() => openOverlay({ kind: 'session', sessionId: session.id })}
              >
                <span className="session-top">
                  <span className="session-time">{session.time}</span>
                  <span className="session-top-right">
                    {session.official ? (
                      <span className="official-badge">Official</span>
                    ) : session.track ? (
                      <span className="track-chip">{session.track}</span>
                    ) : null}
                    {!session.official ? (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={
                          onSchedule ? 'Remove from my schedule' : 'Add to my schedule'
                        }
                        className={onSchedule ? 'quick-add quick-add-on' : 'quick-add'}
                        onClick={(e) => quickToggle(e, session.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            quickToggle(e as unknown as React.MouseEvent, session.id);
                          }
                        }}
                      >
                        <Icon
                          path={onSchedule ? mdiCheck : mdiPlus}
                          size={16}
                          color={onSchedule ? colors.textDark : colors.green}
                        />
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="session-title">{session.title}</span>
                <span className="session-meta-row">
                  <Icon path={mdiMapMarkerOutline} size={14} color={colors.textSecondary} />
                  <span className="session-room">
                    {session.room}
                    {speaker ? ` · ${speaker.name}` : ''}
                  </span>
                </span>
              </LiquidButton>
            );
          })
        )}
      </div>
    </div>
  );
}
