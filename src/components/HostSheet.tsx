import { useState } from 'react';
import { mdiCheckDecagram } from '@mdi/js';
import type { Attendee, Conference } from '../offsite/domain/types';
import { getRepository } from '../offsite/data';
import { conferenceIso } from '../offsite/format';
import { nightLabels } from '../offsite/fixtures/conference';
import { Sheet, useDismiss } from '../ui/Sheet';
import { Burst } from '../ui/Burst';
import { Icon } from '../icons';
import { colors } from '../theme';

/**
 * Attendee event submission. The mobile app looks venues up through Mapbox
 * search; the web demo has no API token to ship, so it offers a preset list
 * of downtown venues instead — enough to run the submit → review → approve
 * loop live with an audience.
 */
const VENUES = [
  { name: 'Capital Factory', lat: 30.2686, lng: -97.7409 },
  { name: 'Half Step', lat: 30.2549, lng: -97.7383 },
  { name: 'Emmer & Rye', lat: 30.2597, lng: -97.7395 },
  { name: "Banger's", lat: 30.2551, lng: -97.7379 },
  { name: 'The Bungalow Rooftop', lat: 30.2557, lng: -97.7392 },
  { name: "Kitty Cohen's", lat: 30.2649, lng: -97.7213 },
];

interface Props {
  viewer: Attendee;
  conference: Conference;
  onClose: () => void;
  onSubmitted: () => void;
}

export function HostSheet({ viewer, conference, onClose, onSubmitted }: Props) {
  return (
    <Sheet onClosed={onClose}>
      <HostForm viewer={viewer} conference={conference} onSubmitted={onSubmitted} />
    </Sheet>
  );
}

function HostForm({
  viewer,
  conference,
  onSubmitted,
}: Omit<Props, 'onClose'>) {
  const dismiss = useDismiss();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [night, setNight] = useState(conference.nights[0]);
  const [time, setTime] = useState('19:00');
  const [venueIndex, setVenueIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const venue = VENUES[venueIndex];
      await getRepository(conference.id).submitEvent(conference.id, {
        title,
        description,
        startsAt: conferenceIso(night, time),
        venueName: venue.name,
        lat: venue.lat,
        lng: venue.lng,
        submittedByAttendeeId: viewer.id,
      });
      setSubmitted(true);
      onSubmitted();
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="host-submitted">
        <div className="host-success-icon">
          <Icon path={mdiCheckDecagram} size={30} color={colors.green} />
          <Burst />
        </div>
        <div className="sheet-title">Sent for review</div>
        <p className="sheet-description">
          Your event went to the organizer&apos;s review queue. It appears on
          the map as soon as they approve it — flip on Organizer mode in
          More to play that side yourself.
        </p>
        <button className="rsvp-button" onClick={dismiss}>
          Done
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="sheet-title">Host your own event</div>
      <p className="sheet-description">
        Your name goes on it, and an organizer approves it before it
        reaches the map.
      </p>

      <label className="field-label" htmlFor="host-title">Title</label>
      <input
        id="host-title"
        className="field-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Board games + beer"
        maxLength={80}
      />

      <label className="field-label" htmlFor="host-desc">Description</label>
      <textarea
        id="host-desc"
        className="field-input field-textarea"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What should people expect?"
        maxLength={280}
      />

      <span className="field-label">Night</span>
      <div className="night-row">
        {conference.nights.map((n) => (
          <button
            key={n}
            className={n === night ? 'night-chip night-chip-active' : 'night-chip'}
            onClick={() => setNight(n)}
          >
            {nightLabels[n] ?? n}
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="host-time">Starts at</label>
      <input
        id="host-time"
        className="field-input"
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />

      <label className="field-label" htmlFor="host-venue">Venue</label>
      <select
        id="host-venue"
        className="field-input"
        value={venueIndex}
        onChange={(e) => setVenueIndex(Number(e.target.value))}
      >
        {VENUES.map((v, i) => (
          <option key={v.name} value={i}>
            {v.name}
          </option>
        ))}
      </select>

      <button
        className="rsvp-button"
        onClick={() => void submit()}
        disabled={!title.trim() || busy}
      >
        {busy ? '…' : 'Submit for review'}
      </button>
    </>
  );
}
