import { useEffect, useRef, useState } from 'react';
import { mdiAccountOutline, mdiCalendarBlankOutline, mdiMagnify, mdiStorefrontOutline } from '@mdi/js';
import { useActiveRoster } from '../offsite/roster';
import { initials } from '../offsite/format';
import { exhibitors, sessionGuide } from '../data/mock';
import { openOverlay } from '../overlays';
import { Icon } from '../icons';
import { colors } from '../theme';

/** One search box over everything the demo knows: sessions, people, booths. */
export function SearchSheet() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { attendees } = useActiveRoster();

  useEffect(() => {
    // After the slide-up settles — focusing earlier makes the keyboard fight
    // the sheet animation on phones.
    const t = window.setTimeout(() => inputRef.current?.focus(), 350);
    return () => window.clearTimeout(t);
  }, []);

  const q = query.trim().toLowerCase();
  const sessions = q
    ? sessionGuide.filter((s) =>
        `${s.title} ${s.track ?? ''} ${s.room}`.toLowerCase().includes(q),
      )
    : [];
  const people = q
    ? attendees.filter(
        (a) =>
          a.directoryOptIn &&
          `${a.name} ${a.title} ${a.company}`.toLowerCase().includes(q),
      )
    : [];
  const booths = q
    ? exhibitors.filter((e) => `${e.name} ${e.booth}`.toLowerCase().includes(q))
    : [];

  const empty = q && sessions.length + people.length + booths.length === 0;

  return (
    <div>
      <div className="search-box search-box-hero">
        <Icon path={mdiMagnify} size={20} color={colors.textSecondary} />
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Sessions, people, exhibitors…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!q ? (
        <div className="search-hints">
          <span className="field-label">Try</span>
          <div className="chip-cloud">
            {['AI', 'Design', 'Technology', 'Abhinav', 'Finance'].map((hint) => (
              <button key={hint} className="cloud-chip" onClick={() => setQuery(hint)}>
                {hint}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sessions.length > 0 ? (
        <div className="search-group">
          <div className="group-header">
            <span className="group-label">SESSIONS</span>
            <span className="group-count">{sessions.length}</span>
          </div>
          {sessions.map((s) => (
            <button
              key={s.id}
              className="search-row"
              onClick={() => openOverlay({ kind: 'session', sessionId: s.id })}
            >
              <Icon path={mdiCalendarBlankOutline} size={18} color={colors.green} />
              <span className="person-body">
                <span className="person-name">{s.title}</span>
                <span className="person-title">
                  {s.time} · {s.room}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {people.length > 0 ? (
        <div className="search-group">
          <div className="group-header">
            <span className="group-label">PEOPLE</span>
            <span className="group-count">{people.length}</span>
          </div>
          {people.map((a) => (
            <button
              key={a.id}
              className="search-row"
              onClick={() => openOverlay({ kind: 'profile', attendeeId: a.id })}
            >
              <span className="person-avatar person-avatar-sm">{initials(a.name)}</span>
              <span className="person-body">
                <span className="person-name">{a.name}</span>
                <span className="person-title">
                  {a.title} · {a.company}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {booths.length > 0 ? (
        <div className="search-group">
          <div className="group-header">
            <span className="group-label">EXHIBITORS</span>
            <span className="group-count">{booths.length}</span>
          </div>
          {booths.map((e) => (
            <button
              key={e.id}
              className="search-row"
              onClick={() => openOverlay({ kind: 'exhibitor', exhibitorId: e.id })}
            >
              <Icon path={mdiStorefrontOutline} size={18} color={colors.green} />
              <span className="person-body">
                <span className="person-name">{e.name}</span>
                <span className="person-title">Booth {e.booth}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {empty ? (
        <div className="search-empty">
          <Icon path={mdiAccountOutline} size={26} color={colors.textSecondary} />
          <p className="empty-text">Nothing matches “{query}” yet.</p>
        </div>
      ) : null}
    </div>
  );
}
