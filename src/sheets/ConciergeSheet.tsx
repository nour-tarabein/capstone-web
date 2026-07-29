import { useEffect, useRef, useState } from 'react';
import { mdiSend, mdiStarFourPoints } from '@mdi/js';
import type { Attendee } from '../offsite/domain/types';
import { useViewerId } from '../offsite/persona';
import { useActiveRoster } from '../offsite/roster';
import { sessionGuide, wifiInfo } from '../data/mock';
import { openMap } from '../App';
import { useDismiss } from '../ui/Sheet';
import { Icon } from '../icons';
import { colors } from '../theme';

/**
 * The concierge is scripted, not a live model — answers are computed from the
 * same mock data the rest of the app renders, so nothing it says can disagree
 * with a screen. The typing effect sells it; the fixtures keep it honest.
 */
type Msg = { role: 'user' | 'bot'; text: string; mapCta?: boolean };

const SUGGESTIONS = [
  'What’s happening tonight?',
  'Recommend sessions for me',
  'When is the opening reception?',
  'What’s the WiFi password?',
];

function answer(question: string, viewer: Attendee | undefined): Msg {
  const q = question.toLowerCase();

  if (q.includes('tonight') || q.includes('evening')) {
    return {
      role: 'bot',
      text: 'Tonight is the Summit Opening Reception on the Terrace, 6:00–9:00 PM. There are also dinners and meetups around downtown on the Tonight Nearby map — RSVP and you’ll see who else is going.',
      mapCta: true,
    };
  }
  if (q.includes('recommend') || q.includes('session')) {
    const interests = viewer?.interests ?? [];
    const picks = sessionGuide
      .filter(
        (s) =>
          s.track !== undefined &&
          interests.includes(s.track) &&
          !(viewer?.sessionIds.includes(s.id) ?? false),
      )
      .slice(0, 3);
    if (picks.length === 0) {
      return {
        role: 'bot',
        text: 'You’re already registered for everything on your interest tracks — nice. Browse the Session Guide for something outside your lane.',
      };
    }
    return {
      role: 'bot',
      text:
        `Based on your interests (${interests.join(', ')}), try:\n` +
        picks.map((s) => `• ${s.title} — ${s.time}, ${s.room}`).join('\n'),
    };
  }
  if (q.includes('reception') || q.includes('party') || q.includes('opening')) {
    return {
      role: 'bot',
      text: 'The Summit Opening Reception runs 6:00–9:00 PM tonight on the Terrace. It’s on everyone’s schedule — no RSVP needed.',
    };
  }
  if (q.includes('wifi') || q.includes('wi-fi') || q.includes('password')) {
    return {
      role: 'bot',
      text: `Network “${wifiInfo.ssid}”, password “${wifiInfo.password}”. It’s also under More → Conference WiFi.`,
    };
  }
  if (q.includes('badge') || q.includes('registration') || q.includes('check')) {
    return {
      role: 'bot',
      text: 'Badge pickup is at the registration desk on Level 1, open until 7:00 PM today. Your QR badge also lives on the My Event tab.',
    };
  }
  return {
    role: 'bot',
    text: 'I can help with the schedule, tonight’s events, WiFi, or badge pickup. (In this demo I only know what’s in the app — try one of the suggestions.)',
  };
}

export function ConciergeSheet() {
  const viewerId = useViewerId();
  const { attendeesById } = useActiveRoster();
  const viewer = attendeesById.get(viewerId);
  const dismiss = useDismiss();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'bot',
      text: `Hi ${viewer?.name.split(' ')[0] ?? 'there'}! I’m the summit concierge. What do you need?`,
    },
  ]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  // Characters of the newest bot message revealed so far.
  const [revealed, setRevealed] = useState(Infinity);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999 });
  }, [messages, typing, revealed]);

  useEffect(() => {
    if (!Number.isFinite(revealed)) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'bot' || revealed >= last.text.length) {
      setRevealed(Infinity);
      return;
    }
    const t = window.setTimeout(() => setRevealed((r) => r + 3), 18);
    return () => window.clearTimeout(t);
  }, [revealed, messages]);

  function ask(question: string) {
    if (typing) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setDraft('');
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, answer(question, viewer)]);
      setRevealed(0);
    }, 900);
  }

  return (
    <div className="dm-sheet">
      <div className="dm-head">
        <span className="concierge-avatar">
          <Icon path={mdiStarFourPoints} size={18} color={colors.textDark} />
        </span>
        <div>
          <div className="person-name">Summit Concierge</div>
          <div className="person-title">Scripted for the demo — knows the whole app</div>
        </div>
      </div>

      <div className="dm-thread" ref={scrollRef}>
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          const text =
            m.role === 'bot' && isLast && Number.isFinite(revealed)
              ? m.text.slice(0, revealed)
              : m.text;
          return (
            <div key={i} className={m.role === 'user' ? 'dm-bubble dm-bubble-me' : 'dm-bubble'}>
              <span className="prewrap">{text}</span>
              {m.mapCta && (!isLast || !Number.isFinite(revealed)) ? (
                <button
                  className="bubble-cta"
                  onClick={() => {
                    dismiss();
                    openMap();
                  }}
                >
                  Open Tonight Nearby →
                </button>
              ) : null}
            </div>
          );
        })}
        {typing ? (
          <div className="dm-bubble dm-typing" aria-label="Concierge is typing">
            <span /><span /><span />
          </div>
        ) : null}
      </div>

      <div className="suggestion-row">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="cloud-chip" onClick={() => ask(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="dm-composer">
        <input
          className="search-input dm-input"
          placeholder="Ask about the summit…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) ask(draft.trim());
          }}
        />
        <button
          className="dm-send"
          onClick={() => draft.trim() && ask(draft.trim())}
          disabled={!draft.trim() || typing}
          aria-label="Send question"
        >
          <Icon path={mdiSend} size={18} color={colors.textDark} />
        </button>
      </div>
    </div>
  );
}
