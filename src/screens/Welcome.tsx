import { useState } from 'react';
import { goToTab } from '../App';
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

/**
 * First-run check-in for the Tysons Corner conference. App.tsx forces this
 * route whenever the active conference is Tysons and this browser has no
 * stored check-in for it; submitting creates a real attendee and lands on
 * the Home tab.
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
      <div className="screen-scroll welcome-content">
        <div className="welcome-heading">
          <div className="welcome-title">Welcome to {tysonsConference.name}</div>
          <p className="welcome-subtitle">
            Tell us who you are so we can personalize your schedule and connections.
          </p>
        </div>

        <label className="field-label" htmlFor="welcome-first-name">First name</label>
        <input
          id="welcome-first-name"
          className="field-input"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Jamie"
          maxLength={60}
          autoFocus
        />

        <label className="field-label" htmlFor="welcome-last-name">Last name</label>
        <input
          id="welcome-last-name"
          className="field-input"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Rivera"
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

        {error ? <p className="welcome-error">{error}</p> : null}

        <button className="rsvp-button" onClick={() => void submit()} disabled={!canSubmit}>
          {busy ? '…' : 'Check in'}
        </button>
      </div>
    </div>
  );
}
