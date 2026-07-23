import { useState } from 'react';
import { mdiLockOutline } from '@mdi/js';
import type { AttendingGroup, AttendingList, Conference } from '../offsite/domain/types';
import { initials } from '../offsite/format';
import { openOverlay } from '../overlays';
import { Icon } from '../icons';
import { colors } from '../theme';

/**
 * The payoff — and the gate. Names are unreachable until the viewer has RSVP'd
 * themselves (DESIGN.md #9). Grouped by overlap rather than ranked, so the
 * section header carries the explanation (DESIGN.md #16). The 'none' bucket
 * collapses behind a count.
 */
const GROUP_COLORS: Record<string, string> = {
  session: '#00E676',
  interest: '#4CC9F0',
  company: '#FFD166',
  none: '#A8B0AC',
};

/** Stable avatar tint per person so the list reads as people, not clones. */
const AVATAR_TINTS = ['#1B3D2F', '#173A44', '#3E3320', '#3A2530', '#2A2F4A'];

function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(h) % AVATAR_TINTS.length];
}

export function AttendingListView({
  attending,
  conference,
}: {
  attending: AttendingList;
  conference: Conference;
}) {
  if (attending.gated) {
    return (
      <div className="attending-section attending-gated">
        <div className="gate-lock">
          <Icon path={mdiLockOutline} size={18} color={colors.green} />
        </div>
        <div className="attending-count">
          {attending.goingCount > 0
            ? `${attending.goingCount} from ${conference.name} are going`
            : `Nobody from ${conference.name} yet`}
        </div>
        <p className="gate-copy">
          RSVP to see who. We only show you the room if you&apos;re in it.
        </p>
      </div>
    );
  }

  return (
    <div className="attending-section">
      <div className="attending-count">
        {attending.goingCount} going
        {attending.anonymousCount > 0 ? (
          <span className="attending-anon"> · {attending.anonymousCount} attending privately</span>
        ) : null}
      </div>

      {attending.groups.map((group) =>
        group.kind === 'none' ? (
          <CollapsedGroup key={group.kind} group={group} />
        ) : (
          <Group key={group.kind} group={group} />
        ),
      )}
    </div>
  );
}

function Group({ group }: { group: AttendingGroup }) {
  return (
    <div className="attending-group">
      <div className="group-header">
        <span
          className="group-swatch"
          style={{ background: GROUP_COLORS[group.kind] ?? colors.textSecondary }}
        />
        <span className="group-label">{group.label.toUpperCase()}</span>
        <span className="group-count">{group.people.length}</span>
      </div>
      <People group={group} />
    </div>
  );
}

function CollapsedGroup({ group }: { group: AttendingGroup }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="attending-group">
      <button className="group-toggle" onClick={() => setOpen(!open)}>
        {open ? '−' : '+'} {group.people.length} others attending
      </button>
      {open ? <People group={group} /> : null}
    </div>
  );
}

function People({ group }: { group: AttendingGroup }) {
  return (
    <div className="people">
      {group.people.map(({ attendee, detail }, i) => (
        <div
          key={attendee.id}
          className="person person-appear"
          style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }}
        >
          <span
            className="person-avatar"
            style={{ background: tintFor(attendee.name) }}
          >
            {initials(attendee.name)}
          </span>
          <span className="person-body">
            <span className="person-name">{attendee.name}</span>
            <span className="person-title">
              {attendee.title} · {attendee.company}
            </span>
            {detail ? <span className="person-reason">{detail}</span> : null}
          </span>
          {/* Hands off to the attendee-hub thread, same as tapping them in
              the directory. */}
          <button
            className="dm-button"
            onClick={() => openOverlay({ kind: 'dm', attendeeId: attendee.id })}
          >
            Message
          </button>
        </div>
      ))}
    </div>
  );
}
