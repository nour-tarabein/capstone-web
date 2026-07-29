import { useEffect, useState } from 'react';
import {
  mdiChevronDown,
  mdiChevronRight,
  mdiChevronUp,
  mdiMapMarkerOutline,
  mdiMapOutline,
  mdiShieldCheckOutline,
  mdiTrayFull,
} from '@mdi/js';
import { ScreenHeader } from '../components/ScreenHeader';
import { VenueMapPreview } from '../components/VenueMapPreview';
import { openMap, openReview } from '../App';
import { moreGeneralItems, moreInviteOnlyItems, moreMenuItems } from '../data/mock';
import { getRepository } from '../offsite/data';
import {
  setActiveConferenceId,
  useActiveConference,
  useActiveConferenceId,
} from '../offsite/activeConference';
import { setAdminMode, useAdminMode } from '../offsite/adminMode';
import { conferences } from '../offsite/fixtures/conference';
import { initials } from '../offsite/format';
import { shouldShowOrganizerToggle, shouldShowPersonaSwitcher } from '../offsite/moreVisibility';
import { setViewerId, useViewerId } from '../offsite/persona';
import { useActiveRoster } from '../offsite/roster';
import { openOverlay, type Overlay } from '../overlays';
import { Icon } from '../icons';
import { colors } from '../theme';

/** Every More row opens its sheet — no dead ends on this screen. */
const ROW_TARGETS: Record<string, Overlay['kind']> = {
  attendees: 'attendees',
  activity: 'activity',
  sponsors: 'sponsors',
  speakers: 'speakers',
  onDemand: 'ondemand',
  games: 'games',
  wifi: 'wifi',
  agenda: 'agenda',
  awards: 'awards',
};

function openRow(id: string) {
  const kind = ROW_TARGETS[id];
  if (kind) openOverlay({ kind } as Overlay);
}

export function MoreScreen() {
  const [generalOpen, setGeneralOpen] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const viewerId = useViewerId();
  const activeConferenceId = useActiveConferenceId();
  const adminMode = useAdminMode(activeConferenceId);
  const activeConference = useActiveConference();
  const { attendees, attendeesById } = useActiveRoster();
  const viewer = attendeesById.get(viewerId);
  const showOrganizerToggle = shouldShowOrganizerToggle(activeConferenceId);
  const showPersonaSwitcher = shouldShowPersonaSwitcher(activeConferenceId, adminMode);

  // Refresh when organizer mode turns on, when the active conference changes,
  // and again when the tab regains focus after a trip to the review queue —
  // the badge has to drop once something is approved, otherwise it lies.
  useEffect(() => {
    if (!adminMode) return;
    let cancelled = false;
    const refresh = () =>
      void getRepository(activeConferenceId)
        .listPendingEvents(activeConferenceId)
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
  }, [adminMode, activeConferenceId]);

  return (
    <div className="screen screen-light">
      <ScreenHeader title="More" />

      <div className="screen-scroll">
        {moreMenuItems.map((item, index) => (
          <div key={item.id}>
            <button className="more-row" onClick={() => openRow(item.id)}>
              <Icon path={item.icon} size={24} color={colors.textDark} className="more-row-icon" />
              <span className="more-row-label">{item.label}</span>
              <Icon path={mdiChevronRight} size={18} color={colors.textMutedDark} />
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
                <button className="more-row" onClick={() => openRow(item.id)}>
                  <Icon path={item.icon} size={24} color={colors.textDark} className="more-row-icon" />
                  <span className="more-row-label more-row-label-truncate">{item.label}</span>
                  <Icon path={mdiChevronRight} size={18} color={colors.textMutedDark} />
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
              <button key={item.id} className="more-row" onClick={() => openRow(item.id)}>
                <Icon path={item.icon} size={24} color={colors.textDark} className="more-row-icon" />
                <span className="more-row-label">{item.label}</span>
                <Icon path={mdiChevronRight} size={18} color={colors.textMutedDark} />
              </button>
            ))
          : null}

        <div className="section-divider" />

        <button className="offsite-row" onClick={openMap} aria-label="Open tonight nearby map">
          <Icon path={mdiMapOutline} size={22} color={colors.green} />
          <span className="offsite-row-text">Tonight Nearby</span>
          <Icon path={mdiChevronRight} size={18} color={colors.textSecondary} />
        </button>

        {showPersonaSwitcher ? (
          <>
            <div className="section-divider" />

            <div className="persona-settings">
              <span className="more-section-title">Viewing as</span>
              <p className="admin-hint persona-settings-hint">
                {viewer
                  ? `${viewer.name} · ${viewer.title}`
                  : 'Pick who you are for this demo'}
              </p>
              <div className="persona-settings-list">
                {attendees.map((person) => {
                  const active = person.id === viewerId;
                  return (
                    <button
                      key={person.id}
                      className={active ? 'persona persona-active' : 'persona'}
                      onClick={() => setViewerId(person.id)}
                    >
                      <span className="persona-avatar">{initials(person.name)}</span>
                      <span className="persona-settings-name">
                        <span>{person.name}</span>
                        <span className="persona-settings-meta">{person.company}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}

        <div className="section-divider" />

        {showOrganizerToggle ? (
          // Demo affordance: in production the organizer console is a
          // separate surface behind a separate login. See src/offsite/adminMode.ts.
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
              onClick={() => setAdminMode(activeConferenceId, !adminMode)}
            >
              <span className="toggle-thumb" />
            </button>
          </div>
        ) : null}

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
          <span className="location-name">{activeConference.venueName}</span>
        </div>

        <button
          className="location-map-card"
          onClick={openMap}
          aria-label={`Open map for ${activeConference.venueName}`}
        >
          <VenueMapPreview conference={activeConference} />
          <span className="location-map-chip">Tap to open map</span>
        </button>

        <div className="section-divider" />

        <div className="persona-settings">
          <span className="more-section-title">Active conference</span>
          <p className="admin-hint persona-settings-hint">
            Switch which conference this browser is showing.
          </p>
          <div className="persona-settings-list">
            {conferences.map((c) => {
              const active = c.id === activeConferenceId;
              return (
                <button
                  key={c.id}
                  className={active ? 'persona persona-active' : 'persona'}
                  onClick={() => setActiveConferenceId(c.id)}
                >
                  <span className="persona-avatar">
                    <Icon
                      path={mdiMapMarkerOutline}
                      size={14}
                      color={active ? colors.textDark : colors.textMutedDark}
                    />
                  </span>
                  <span className="persona-settings-name">
                    <span>{c.city}</span>
                    <span className="persona-settings-meta">{c.venueName}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button className="exit-button" onClick={() => openOverlay({ kind: 'exit' })}>
          Exit event
        </button>
      </div>
    </div>
  );
}
