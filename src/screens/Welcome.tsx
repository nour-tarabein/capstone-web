import { useState } from 'react';
import { goToTab } from '../App';
import { LiquidButton } from '../components/LiquidButton';
import { LiquidGlass } from '../components/LiquidGlass';
import { ShaderAnimation } from '../components/ShaderAnimation';
import { checkIn } from '../offsite/checkin';
import { getActiveConferenceId } from '../offsite/activeConference';
import { tysonsConference } from '../offsite/fixtures/conference';

/** Reuses the existing department taxonomy from the attendee roster (issue #5). */
const DEPARTMENTS = [
  'Executive Leadership',
  'Technology',
  'Finance',
  'Marketing',
  'Client Services',
  'Information Technology',
  'Sales',
];

/** The app's jade accent (#4FD1A0) as shader tint channels, 0–1. */
const JADE_TINT = [0.31, 0.82, 0.63] as const;

/**
 * First-run check-in for the Tysons Corner conference. App.tsx forces this
 * route whenever the active conference is Tysons and this browser has no
 * stored check-in for it; submitting creates a real attendee and lands on
 * the Home tab.
 *
 * This is the first thing an attendee ever sees, so it gets the full
 * treatment: an animated light-ripple shader backdrop with the check-in form
 * floating over it on refractive glass.
 */
export function WelcomeScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await checkIn(getActiveConferenceId(), { firstName, lastName, department });
      goToTab('home');
    } catch {
      setError('Something went wrong — try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen welcome-screen">
      <ShaderAnimation
        className="welcome-shader"
        tint={JADE_TINT}
        speed={0.5}
        frequency={11}
        lineWidth={0.0024}
        brightness={1.15}
      />
      {/* Darkens the ripple toward the middle of the screen so the form reads
          cleanly over it without dimming the glow at the edges. */}
      <div className="welcome-veil" aria-hidden="true" />

      <div className="screen-scroll welcome-content">
        <div className="welcome-card">
          {/* Low frost + strong refraction: the ripple should bend around the
              card's rim rather than just blur out behind it. */}
          <LiquidGlass className="welcome-card-glass" frost={5} refraction={2.4} />

          <div className="welcome-heading">
            <div className="welcome-eyebrow">Check in</div>
            <h1 className="welcome-title">Welcome to {tysonsConference.name}</h1>
            <p className="welcome-subtitle">
              Tell us who you are so we can personalize your schedule and connections.
            </p>
          </div>

          <div className="welcome-fields">
            <label className="field-label" htmlFor="welcome-first-name">First name</label>
            <input
              id="welcome-first-name"
              className="field-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={60}
              autoFocus
            />

            <label className="field-label" htmlFor="welcome-last-name">Last name</label>
            <input
              id="welcome-last-name"
              className="field-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={60}
            />

            <label className="field-label" htmlFor="welcome-department">Department</label>
            <select
              id="welcome-department"
              className="field-input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="welcome-error">{error}</p> : null}

          <LiquidButton
            className="rsvp-button welcome-submit"
            frost={2}
            onClick={() => void submit()}
            disabled={!canSubmit}
          >
            {busy ? 'Checking you in…' : 'Check in'}
          </LiquidButton>
        </div>
      </div>
    </div>
  );
}
