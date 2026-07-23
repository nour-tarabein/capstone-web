import { useEffect, useState } from 'react';
import {
  mdiChevronDown,
  mdiChevronRight,
  mdiChevronUp,
  mdiMapOutline,
  mdiShieldCheckOutline,
  mdiTrayFull,
} from '@mdi/js';
import { ScreenHeader } from '../components/ScreenHeader';
import { openMap, openReview } from '../App';
import {
  eventLocation,
  moreGeneralItems,
  moreInviteOnlyItems,
  moreMenuItems,
} from '../data/mock';
import { repository } from '../offsite/data';
import { setAdminMode, useAdminMode } from '../offsite/adminMode';
import { Icon } from '../icons';
import { colors } from '../theme';

export function MoreScreen() {
  const [generalOpen, setGeneralOpen] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(true);
  const adminMode = useAdminMode();
  const [pendingCount, setPendingCount] = useState(0);

  // Refresh when organizer mode turns on and again when the tab regains
  // focus after a trip to the review queue — the badge has to drop once
  // something is approved, otherwise it lies.
  useEffect(() => {
    if (!adminMode) return;
    let cancelled = false;
    const refresh = () =>
      void repository
        .listPendingEvents()
        .then((list) => {
          if (!cancelled) setPendingCount(list.length);
        })
        .catch(() => {
          if (!cancelled) setPendingCount(0);
        });
    refresh();
    window.addEventListener('hashchange', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', refresh);
    };
  }, [adminMode]);

  return (
    <div className="screen screen-light">
      <ScreenHeader title="More" />

      <div className="screen-scroll">
        {moreMenuItems.map((item, index) => (
          <div key={item.id}>
            <button className="more-row">
              <Icon path={item.icon} size={24} color={colors.textDark} className="more-row-icon" />
              <span className="more-row-label">{item.label}</span>
            </button>
            {index < moreMenuItems.length - 1 ? <div className="more-separator" /> : null}
          </div>
        ))}

        <div className="section-divider" />

        <button className="more-section-header" onClick={() => setGeneralOpen((o) => !o)}>
          <span className="more-section-title">General</span>
          <Icon
            path={generalOpen ? mdiChevronUp : mdiChevronDown}
            size={20}
            color={colors.textMutedDark}
          />
        </button>

        {generalOpen
          ? moreGeneralItems.map((item, index) => (
              <div key={item.id}>
                <button className="more-row">
                  <Icon path={item.icon} size={24} color={colors.textDark} className="more-row-icon" />
                  <span className="more-row-label more-row-label-truncate">{item.label}</span>
                </button>
                {index < moreGeneralItems.length - 1 ? (
                  <div className="more-separator" />
                ) : null}
              </div>
            ))
          : null}

        <div className="section-divider" />

        <button className="more-section-header" onClick={() => setInviteOpen((o) => !o)}>
          <span className="more-section-title">Invite-only</span>
          <Icon
            path={inviteOpen ? mdiChevronUp : mdiChevronDown}
            size={20}
            color={colors.textMutedDark}
          />
        </button>

        {inviteOpen
          ? moreInviteOnlyItems.map((item) => (
              <button key={item.id} className="more-row">
                <Icon path={item.icon} size={24} color={colors.textDark} className="more-row-icon" />
                <span className="more-row-label">{item.label}</span>
              </button>
            ))
          : null}

        <div className="section-divider" />

        <button className="offsite-row" onClick={openMap} aria-label="Open tonight nearby map">
          <Icon path={mdiMapOutline} size={22} color={colors.green} />
          <span className="offsite-row-text">Tonight Nearby</span>
          <Icon path={mdiChevronRight} size={18} color={colors.textSecondary} />
        </button>

        <div className="section-divider" />

        {/* Demo affordance: in production the organizer console is a separate
            surface behind a separate login. See src/offsite/adminMode.ts. */}
        <div className="admin-row">
          <Icon path={mdiShieldCheckOutline} size={22} color={colors.green} />
          <span className="admin-label-wrap">
            <span className="offsite-row-text">Organizer mode</span>
            <span className="admin-hint">Review events attendees submit</span>
          </span>
          <button
            role="switch"
            aria-checked={adminMode}
            aria-label="Toggle organizer mode"
            className={adminMode ? 'toggle toggle-on' : 'toggle'}
            onClick={() => setAdminMode(!adminMode)}
          >
            <span className="toggle-thumb" />
          </button>
        </div>

        {adminMode ? (
          <button
            className="offsite-row"
            onClick={openReview}
            aria-label="Open the event review queue"
          >
            <Icon path={mdiTrayFull} size={22} color={colors.green} />
            <span className="offsite-row-text">Review queue</span>
            {pendingCount > 0 ? <span className="pending-badge">{pendingCount}</span> : null}
            <Icon path={mdiChevronRight} size={18} color={colors.textSecondary} />
          </button>
        ) : null}

        <div className="section-divider" />

        <div className="location-header">
          <span className="more-section-title">Location</span>
          <span className="location-name">{eventLocation.name}</span>
        </div>

        <button
          className="location-map-card"
          onClick={openMap}
          aria-label={`Open map for ${eventLocation.name}`}
        >
          <Icon path={mdiMapOutline} size={26} color={colors.textMutedDark} />
          <span className="location-map-chip">Tap to open map</span>
        </button>

        <button className="exit-button">Exit event</button>
      </div>
    </div>
  );
}
