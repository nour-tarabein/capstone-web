import { useEffect, useState } from 'react';
import { mdiCheckDecagram } from '@mdi/js';
import type { Attendee, Conference } from '../offsite/domain/types';
import { getRepository } from '../offsite/data';
import { conferenceIso } from '../offsite/format';
import { nightLabels } from '../offsite/fixtures/conference';
import { openReview } from '../App';
import { Sheet } from '../ui/Sheet';
import { venuesForConference } from '../offsite/fixtures/venues';
import { Sheet, useDismiss } from '../ui/Sheet';
import { Burst } from '../ui/Burst';
import { Icon } from '../icons';
import { colors } from '../theme';

/**
 * Attendee event submission. The mobile app looks venues up through Mapbox
 * search; the web demo has no API token to ship, so it offers a per-conference
 * venue catalogue of pre-geocoded places instead — enough to run the
 * submit → review → approve loop live with an audience (issue #23).
 */

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
  const venues = venuesForConference(conference.id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [night, setNight] = useState(conference.nights[0]);
  const [time, setTime] = useState('19:00');
  const [venueIndex, setVenueIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  // Active-conference switches must refresh the offered venues without a reload.
  useEffect(() => {
    setNight(conference.nights[0]);
    setVenueIndex(0);
  }, [conference.id]);

  async function submit() {
    const venue = venues[venueIndex];
    if (!title.trim() || busy || !venue) return;
    setBusy(true);
    try {
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
          the map as soon as they approve it.
        </p>
        <button className="rsvp-button" onClick={openReview}>
          Open review queue
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
        disabled={venues.length === 0}
      >
        {venues.map((v, i) => (
          <option key={v.name} value={i}>
            {v.name}
          </option>
        ))}
      </select>

      <button
        className="rsvp-button"
        onClick={() => void submit()}
        disabled={!title.trim() || busy || venues.length === 0}
      >
        {busy ? '…' : 'Submit for review'}
      </button>
    </>
  );
}
