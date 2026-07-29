import { describe, expect, it } from 'vitest';
import type { Attendee } from './offsite/domain/types';
import type { Roster } from './offsite/roster';
import { resolveActiveViewer } from './activeViewer';

function attendee(id: string, conferenceId: string): Attendee {
  return {
    id,
    conferenceId,
    name: id,
    title: '',
    company: '',
    photoUrl: '',
    interests: [],
    sessionIds: [],
    directoryOptIn: true,
  };
}

function roster(...attendees: Attendee[]): Roster {
  return {
    attendees,
    attendeesById: new Map(attendees.map((person) => [person.id, person])),
  };
}

describe('resolveActiveViewer', () => {
  it('uses the selected viewer when they belong to the active conference', () => {
    const selected = attendee('a12', 'austin');
    expect(resolveActiveViewer('austin', roster(selected), selected.id)).toBe(selected);
  });

  it('uses this browser\'s checked-in attendee after switching conferences', () => {
    const austinViewer = attendee('a47', 'austin');
    const tysonsViewer = attendee('checked-in', 'tysons');

    expect(
      resolveActiveViewer('tysons', roster(attendee('t1', 'tysons')), austinViewer.id, tysonsViewer),
    ).toBe(tysonsViewer);
  });

  it('falls back to the Austin demo presenter when a stored persona belongs elsewhere', () => {
    const presenter = attendee('a47', 'austin');
    expect(resolveActiveViewer('austin', roster(attendee('a1', 'austin'), presenter), 't1')).toBe(
      presenter,
    );
  });

  it('falls back to an available roster member instead of suppressing event actions', () => {
    const available = attendee('t1', 'tysons');
    expect(resolveActiveViewer('tysons', roster(available), 'a47')).toBe(available);
  });
});
