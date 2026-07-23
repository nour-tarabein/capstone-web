import { useState } from 'react';
import type { AttendingGroup, AttendingList, Conference } from '../offsite/domain/types';
import { initials } from '../offsite/format';

/**
 * The payoff — and the gate. Names are unreachable until the viewer has RSVP'd
 * themselves (DESIGN.md #9). Grouped by overlap rather than ranked, so the
 * section header carries the explanation (DESIGN.md #16). The 'none' bucket
 * collapses behind a count.
 */
export function AttendingListView({
  attending,
  conference,
}: {
  attending: AttendingList;
  conference: Conference;
}) {
  if (attending.gated) {
    return (
      <div className="attending-section">
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
      {group.people.map(({ attendee, detail }) => (
        <div key={attendee.id} className="person">
          <span className="person-avatar">{initials(attendee.name)}</span>
          <span className="person-body">
            <span className="person-name">{attendee.name}</span>
            <span className="person-title">
              {attendee.title} · {attendee.company}
            </span>
            {detail ? <span className="person-reason">{detail}</span> : null}
          </span>
          {/* Hands off to the existing Attendee Hub profile + DM. */}
          <button className="dm-button">Message</button>
        </div>
      ))}
    </div>
  );
}
