import { useState } from 'react';
import {
  mdiBellOutline,
  mdiCheck,
  mdiContentCopy,
  mdiHeart,
  mdiHeartOutline,
  mdiLockOutline,
  mdiMedalOutline,
  mdiPlayCircleOutline,
  mdiTrophyOutline,
  mdiWifi,
} from '@mdi/js';
import { useViewer } from '../offsite/viewerResolution';
import { initials } from '../offsite/format';
import {
  activityFeed,
  exhibitors,
  gameChallenges,
  gameLeaderboard,
  scheduleDays,
  sessionGuide,
  speakers,
  updates,
  wifiInfo,
} from '../data/mock';
import { openOverlay } from '../overlays';
import { useDismiss } from '../ui/Sheet';
import { toast } from '../ui/toast';
import { Burst } from '../ui/Burst';
import { Icon } from '../icons';
import { colors } from '../theme';

export function SpeakersSheet() {
  return (
    <div>
      <div className="sheet-title">Speakers</div>
      <div className="sheet-meta">Tap a speaker for their session</div>
      <div className="people people-list">
        {speakers.map((s) => (
          <button
            key={s.sessionId}
            className="person person-tappable"
            onClick={() => openOverlay({ kind: 'session', sessionId: s.sessionId })}
          >
            <span className="person-avatar">{initials(s.name)}</span>
            <span className="person-body">
              <span className="person-name">{s.name}</span>
              <span className="person-title">
                {s.title} · {s.company}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const TIER_ORDER = ['Platinum', 'Gold', 'Silver'];

export function SponsorsSheet() {
  return (
    <div>
      <div className="sheet-title">Sponsors</div>
      {TIER_ORDER.map((tier) => {
        const list = exhibitors.filter((e) => e.sponsorship === tier);
        if (list.length === 0) return null;
        return (
          <div key={tier} className="search-group">
            <div className="group-header">
              <span className="group-label">{tier.toUpperCase()}</span>
            </div>
            {list.map((e) => (
              <button
                key={e.id}
                className="search-row"
                onClick={() => openOverlay({ kind: 'exhibitor', exhibitorId: e.id })}
              >
                <span className="person-avatar person-avatar-sm">{initials(e.name)}</span>
                <span className="person-body">
                  <span className="person-name">{e.name}</span>
                  <span className="person-title">Booth {e.booth}</span>
                </span>
              </button>
            ))}
          </div>
        );
      })}
      <p className="gate-copy">
        Community exhibitors are in the Exhibitors tab — every booth counts.
      </p>
    </div>
  );
}

export function OnDemandSheet() {
  // Pretend "now" is Day 1 (Thu) mid-afternoon, matching the My Event
  // timeline: everything that has already run today, nothing later.
  const ready = new Set(['keynote', 's1', 's3', 's4']);
  return (
    <div>
      <div className="sheet-title">On Demand</div>
      <div className="sheet-meta">Session recordings, minutes after they end</div>
      <div className="people people-list">
        {sessionGuide
          .filter((s) => !s.official)
          .map((s) => {
            const isReady = ready.has(s.id);
            return (
              <button
                key={s.id}
                className="search-row"
                onClick={() =>
                  isReady
                    ? toast('Recordings stream here in the full app')
                    : openOverlay({ kind: 'session', sessionId: s.id })
                }
              >
                <Icon
                  path={mdiPlayCircleOutline}
                  size={22}
                  color={isReady ? colors.green : colors.textSecondary}
                />
                <span className="person-body">
                  <span className="person-name">{s.title}</span>
                  <span className="person-title">
                    {isReady ? 'Ready to watch' : `Airs ${s.time}`}
                  </span>
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}

/** Points persist across sheet opens (module state) — a refresh resets them
 *  along with the rest of the demo. */
let gamePoints = 830;
const doneChallenges = new Set<string>(['g4']);

export function GamesSheet() {
  const [, force] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const viewer = useViewer();

  function complete(id: string, points: number) {
    if (doneChallenges.has(id)) return;
    doneChallenges.add(id);
    gamePoints += points;
    setBurstKey((k) => k + 1);
    force((n) => n + 1);
    toast(`+${points} points!`);
  }

  const board = [
    ...gameLeaderboard,
    { name: `${viewer?.name ?? 'You'} (you)`, points: gamePoints },
  ].sort((a, b) => b.points - a.points);

  return (
    <div>
      <div className="sheet-head">
        <Icon path={mdiTrophyOutline} size={20} color={colors.green} />
        <span className="sheet-time">Game Center</span>
      </div>
      <div className="sheet-title games-score-row">
        <span>{gamePoints.toLocaleString()} pts</span>
        {burstKey > 0 ? <Burst key={burstKey} /> : null}
      </div>

      <div className="field-label">Challenges</div>
      <div className="people people-list">
        {gameChallenges.map((c) => {
          const done = doneChallenges.has(c.id);
          return (
            <button
              key={c.id}
              className={done ? 'challenge challenge-done' : 'challenge'}
              onClick={() => complete(c.id, c.points)}
            >
              <span className={done ? 'challenge-check challenge-check-done' : 'challenge-check'}>
                {done ? <Icon path={mdiCheck} size={14} color={colors.textDark} /> : null}
              </span>
              <span className="person-body">
                <span className="person-name">{c.label}</span>
                <span className="person-title">{done ? 'Completed' : `${c.points} pts`}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="field-label">Leaderboard</div>
      <div className="people people-list">
        {board.map((row, i) => (
          <div key={row.name} className="leader-row">
            <span className={i === 0 ? 'leader-rank leader-rank-top' : 'leader-rank'}>
              {i + 1}
            </span>
            <span className="person-name leader-name">{row.name}</span>
            <span className="leader-points">{row.points.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivitySheet() {
  const [liked, setLiked] = useState<Set<string>>(new Set());

  function toggleLike(id: string) {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="sheet-title">Activity Feed</div>
      <div className="people people-list">
        {activityFeed.map((post) => {
          const isLiked = liked.has(post.id);
          return (
            <div key={post.id} className="feed-card">
              <div className="feed-head">
                <span className="person-avatar person-avatar-sm">{initials(post.author)}</span>
                <span className="person-name">{post.author}</span>
                <span className="feed-time">{post.time}</span>
              </div>
              <p className="feed-text">{post.text}</p>
              <button
                className={isLiked ? 'like-button like-button-on' : 'like-button'}
                onClick={() => toggleLike(post.id)}
                aria-pressed={isLiked}
              >
                <Icon
                  path={isLiked ? mdiHeart : mdiHeartOutline}
                  size={16}
                  color={isLiked ? colors.notification : colors.textSecondary}
                />
                {post.likes + (isLiked ? 1 : 0)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WifiSheet() {
  function copy(value: string, what: string) {
    void navigator.clipboard
      ?.writeText(value)
      .then(() => toast(`${what} copied`))
      .catch(() => toast(`${what}: ${value}`));
  }

  return (
    <div>
      <div className="sheet-head">
        <Icon path={mdiWifi} size={20} color={colors.green} />
        <span className="sheet-time">Conference WiFi</span>
      </div>
      <div className="sheet-title">Get online</div>
      {(
        [
          ['Network', wifiInfo.ssid],
          ['Password', wifiInfo.password],
        ] as const
      ).map(([label, value]) => (
        <button key={label} className="copy-row" onClick={() => copy(value, label)}>
          <span className="person-body">
            <span className="person-title">{label}</span>
            <span className="person-name copy-value">{value}</span>
          </span>
          <Icon path={mdiContentCopy} size={18} color={colors.textSecondary} />
        </button>
      ))}
      <p className="gate-copy">Tap to copy. Works venue-wide, including the Terrace.</p>
    </div>
  );
}

export function AgendaSheet() {
  return (
    <div>
      <div className="sheet-title">Agenda at a Glance</div>
      {scheduleDays.map((day) => {
        const items = sessionGuide.filter((s) => s.day === day.night);
        const evening = items.find((s) => s.official);
        return (
          <div key={day.night} className="search-group">
            <div className="group-header">
              <span className="group-label">{day.label.toUpperCase()}</span>
              <span className="group-count">{items.length}</span>
            </div>
            <p className="agenda-line">
              Sessions {items[0].time.split('–')[0].trim()} onward
              {evening ? ` · ${evening.title}, ${evening.time}` : ''}
            </p>
          </div>
        );
      })}
      <div className="field-label">Registration desk</div>
      <p className="agenda-line">Level 1 · 8:00 AM – 7:00 PM daily</p>
    </div>
  );
}

export function AwardsSheet() {
  return (
    <div>
      <div className="sheet-head">
        <Icon path={mdiMedalOutline} size={20} color={colors.green} />
        <span className="sheet-time">Invite-only</span>
      </div>
      <div className="sheet-title">Excellence Awards</div>
      <p className="sheet-description">
        Thursday, 7:00 PM in the Grand Ballroom. Celebrating the products and
        teams that defined the year — dinner and a show, invitation required.
      </p>
      <div className="locked-row">
        <Icon path={mdiLockOutline} size={16} color={colors.textSecondary} />
        Your registration doesn&apos;t include this event.
      </div>
    </div>
  );
}

export function UpdatesSheet() {
  return (
    <div>
      <div className="sheet-title">My updates</div>
      <div className="people people-list">
        {updates.map((u) => (
          <div key={u.id} className="feed-card">
            <div className="feed-head">
              <Icon path={mdiBellOutline} size={18} color={colors.green} />
              <span className="person-name">{u.title}</span>
              <span className="feed-time">{u.time}</span>
            </div>
            <p className="feed-text">{u.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Deterministic pseudo-QR: hashed from the attendee id so each persona gets
 *  a distinct pattern. Scannable it is not — a demo badge, honestly fake. */
function qrCells(seed: string, size: number): boolean[] {
  let h = 2166136261;
  const cells: boolean[] = [];
  for (let i = 0; i < size * size; i++) {
    h = Math.imul(h ^ (seed.charCodeAt(i % seed.length) + i), 16777619);
    cells.push(((h >>> 13) & 3) !== 0 ? (h & 1) === 1 : true);
  }
  return cells;
}

export function BadgeSheet() {
  const viewer = useViewer();
  const size = 17;
  const cells = qrCells(viewer?.id ?? 'demo', size);

  return (
    <div className="badge-sheet">
      <div className="sheet-title">Your badge</div>
      <div className="badge-card">
        <svg
          className="badge-qr"
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Badge QR code"
        >
          {cells.map((on, i) =>
            on ? (
              <rect
                key={i}
                x={i % size}
                y={Math.floor(i / size)}
                width={1}
                height={1}
                fill="#111111"
              />
            ) : null,
          )}
        </svg>
        <div className="badge-name">{viewer?.name ?? 'Attendee'}</div>
        <div className="badge-company">
          {viewer ? `${viewer.title} · ${viewer.company}` : ''}
        </div>
      </div>
      <p className="gate-copy">
        Show this at session doors and booth scanners. Screen brightness up!
      </p>
    </div>
  );
}

export function ExitSheet() {
  const dismiss = useDismiss();
  return (
    <div>
      <div className="sheet-title">Exit event?</div>
      <p className="sheet-description">
        Leaving removes the summit from your app until you rejoin with your
        registration email.
      </p>
      <div className="profile-actions">
        <button className="rsvp-button" onClick={dismiss}>
          Stay at the summit
        </button>
        <button
          className="rsvp-button rsvp-going"
          onClick={() => {
            toast('This demo only has one event — staying put!');
            dismiss();
          }}
        >
          Exit event
        </button>
      </div>
    </div>
  );
}
