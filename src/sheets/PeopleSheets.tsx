import { useEffect, useRef, useState } from 'react';
import { mdiMagnify, mdiSend } from '@mdi/js';
import { setViewerId, useViewerId } from '../offsite/persona';
import { useActiveRoster } from '../offsite/roster';
import { sessionTitles } from '../offsite/fixtures/sessions';
import { initials } from '../offsite/format';
import { openOverlay } from '../overlays';
import { useDismiss } from '../ui/Sheet';
import { toast } from '../ui/toast';
import { Icon } from '../icons';
import { colors } from '../theme';

/** Directory shows opt-in attendees only; the opt-outs are counted, never
 *  named — the same privacy rule the attending list follows. */
export function AttendeesSheet() {
  const [query, setQuery] = useState('');
  const { attendees } = useActiveRoster();
  const visible = attendees.filter((a) => a.directoryOptIn);
  const hidden = attendees.length - visible.length;
  const q = query.trim().toLowerCase();
  const results = q
    ? visible.filter((a) =>
        `${a.name} ${a.title} ${a.company}`.toLowerCase().includes(q),
      )
    : visible;

  return (
    <div>
      <div className="sheet-title">Attendees</div>
      <div className="sheet-meta">{attendees.length} registered</div>

      <div className="search-box">
        <Icon path={mdiMagnify} size={18} color={colors.textSecondary} />
        <input
          className="search-input"
          placeholder="Search people, companies…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="people people-list">
        {results.map((a) => (
          <button
            key={a.id}
            className="person person-tappable"
            onClick={() => openOverlay({ kind: 'profile', attendeeId: a.id })}
          >
            <span className="person-avatar">{initials(a.name)}</span>
            <span className="person-body">
              <span className="person-name">{a.name}</span>
              <span className="person-title">
                {a.title} · {a.company}
              </span>
            </span>
          </button>
        ))}
        {results.length === 0 ? (
          <p className="empty-text">No one matches “{query}”.</p>
        ) : null}
      </div>

      {hidden > 0 && !q ? (
        <p className="gate-copy">
          {hidden} attendees opted out of the directory — they&apos;re counted in
          totals but never listed.
        </p>
      ) : null}
    </div>
  );
}

export function ProfileSheet({ attendeeId }: { attendeeId: string }) {
  const viewerId = useViewerId();
  const dismiss = useDismiss();
  const { attendeesById } = useActiveRoster();
  const person = attendeesById.get(attendeeId);
  if (!person) return null;

  const isViewer = person.id === viewerId;

  return (
    <div>
      <div className="profile-sheet-head">
        <span className="person-avatar person-avatar-xl">{initials(person.name)}</span>
        <div>
          <div className="sheet-title profile-sheet-name">{person.name}</div>
          <div className="sheet-meta">
            {person.title} · {person.company}
          </div>
        </div>
      </div>

      <div className="field-label">Interests</div>
      <div className="chip-cloud">
        {person.interests.map((i) => (
          <span key={i} className="cloud-chip">
            {i}
          </span>
        ))}
      </div>

      <div className="field-label">Registered sessions</div>
      <div className="mini-sessions">
        {person.sessionIds.map((sid) => (
          <button
            key={sid}
            className="mini-session"
            onClick={() => openOverlay({ kind: 'session', sessionId: sid })}
          >
            {sessionTitles[sid] ?? sid}
          </button>
        ))}
      </div>

      {isViewer ? (
        <p className="gate-copy">
          This is you — the persona you&apos;re demoing as. Switch personas from
          More → Viewing as.
        </p>
      ) : (
        <div className="profile-actions">
          <button
            className="rsvp-button"
            onClick={() => openOverlay({ kind: 'dm', attendeeId: person.id })}
          >
            Message
          </button>
          <button
            className="rsvp-button rsvp-going"
            onClick={() => {
              setViewerId(person.id);
              toast(`Now viewing as ${person.name.split(' ')[0]}`);
              dismiss();
            }}
          >
            View the demo as {person.name.split(' ')[0]}
          </button>
        </div>
      )}
    </div>
  );
}

type Bubble = { fromMe: boolean; text: string };

/** Canned openers so the thread never starts empty. */
function openerFor(name: string): Bubble[] {
  return [
    {
      fromMe: false,
      text: `Hey! Saw we're both at the summit this week. — ${name.split(' ')[0]}`,
    },
  ];
}

const REPLIES = [
  'Sounds great — see you there!',
  'Perfect, I’ll be around the terrace at 6.',
  'Nice! Let’s find each other at the reception.',
];

export function DMSheet({ attendeeId }: { attendeeId: string }) {
  const { attendeesById } = useActiveRoster();
  const person = attendeesById.get(attendeeId);
  const [bubbles, setBubbles] = useState<Bubble[]>(() =>
    person ? openerFor(person.name) : [],
  );
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const replyCount = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [bubbles, typing]);

  if (!person) return null;

  function send() {
    const text = draft.trim();
    if (!text) return;
    setBubbles((b) => [...b, { fromMe: true, text }]);
    setDraft('');
    setTyping(true);
    const reply = REPLIES[replyCount.current % REPLIES.length];
    replyCount.current += 1;
    window.setTimeout(() => {
      setTyping(false);
      setBubbles((b) => [...b, { fromMe: false, text: reply }]);
    }, 1400);
  }

  return (
    <div className="dm-sheet">
      <div className="dm-head">
        <span className="person-avatar">{initials(person.name)}</span>
        <div>
          <div className="person-name">{person.name}</div>
          <div className="person-title">
            {person.title} · {person.company}
          </div>
        </div>
      </div>

      <div className="dm-thread" ref={scrollRef}>
        {bubbles.map((b, i) => (
          <div
            key={i}
            className={b.fromMe ? 'dm-bubble dm-bubble-me' : 'dm-bubble'}
          >
            {b.text}
          </div>
        ))}
        {typing ? (
          <div className="dm-bubble dm-typing" aria-label={`${person.name} is typing`}>
            <span /><span /><span />
          </div>
        ) : null}
      </div>

      <div className="dm-composer">
        <input
          className="search-input dm-input"
          placeholder={`Message ${person.name.split(' ')[0]}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
        />
        <button
          className="dm-send"
          onClick={send}
          disabled={!draft.trim()}
          aria-label="Send message"
        >
          <Icon path={mdiSend} size={18} color={colors.textDark} />
        </button>
      </div>
    </div>
  );
}
