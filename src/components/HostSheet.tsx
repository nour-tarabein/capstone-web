import { useState } from 'react';
import type { Attendee, Conference } from '../offsite/domain/types';
import { repository } from '../offsite/data';
import { conferenceIso } from '../offsite/format';
import { nightLabels } from '../offsite/fixtures/conference';

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
  visible: boolean;
  viewer: Attendee;
  conference: Conference;
  onClose: () => void;
  onSubmitted: () => void;
}

export function HostSheet({ visible, viewer, conference, onClose, onSubmitted }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [night, setNight] = useState(conference.nights[0]);
  const [time, setTime] = useState('19:00');
  const [venueIndex, setVenueIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!visible) return null;

  function reset() {
    setTitle('');
    setDescription('');
    setNight(conference.nights[0]);
    setTime('19:00');
    setVenueIndex(0);
    setSubmitted(false);
  }

  async function submit() {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const venue = VENUES[venueIndex];
      await repository.submitEvent({
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

  function close() {
    reset();
    onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-scroll">
          <div className="sheet-grabber" />

          {submitted ? (
            <div className="host-submitted">
              <div className="sheet-title">Sent for review</div>
              <p className="sheet-description">
                Your event went to the organizer&apos;s review queue. It appears on
                the map as soon as they approve it — flip on Organizer mode in
                More to play that side yourself.
              </p>
              <button className="rsvp-button" onClick={close}>
                Done
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
