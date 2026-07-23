import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { mdiChevronLeft, mdiPlus, mdiWeatherNight } from '@mdi/js';
import { goBack } from '../App';
import { EventSheet } from '../components/EventSheet';
import { HostSheet } from '../components/HostSheet';
import { SourceBadge } from '../components/SourceBadge';
import type { Attendee, Conference, OffsiteEvent } from '../offsite/domain/types';
import { repository } from '../offsite/data';
import { nightLabels } from '../offsite/fixtures/conference';
import { attendeesById, demoPersonaIds } from '../offsite/fixtures/attendees';
import { milesBetween } from '../offsite/ingestion/curate';
import { setViewerId, useViewerId } from '../offsite/persona';
import { formatTime, sourceColors, sourceNeedsDarkText } from '../offsite/format';
import { Icon } from '../icons';
import { colors } from '../theme';

/**
 * The web port of the app's single map. Mapbox-in-a-WebView becomes Leaflet
 * with CARTO's dark basemap — no access token to ship, which is what lets the
 * demo run on any audience phone straight from GitHub Pages. Nearby search is
 * the one mobile feature left out: it needs the Mapbox Search API.
 */
export function MapScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const viewerId = useViewerId();
  const [conference, setConference] = useState<Conference | null>(null);
  const [viewer, setViewer] = useState<Attendee | null>(null);
  const [night, setNight] = useState<string | null>(null);
  const [events, setEvents] = useState<OffsiteEvent[]>([]);
  const [goingCounts, setGoingCounts] = useState<Record<string, number>>({});
  const [showTonight, setShowTonight] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [hosting, setHosting] = useState(false);

  useEffect(() => {
    void Promise.all([repository.getConference(), repository.getViewer()]).then(
      ([c, v]) => {
        setConference(c);
        setViewer(v);
        setNight((prev) => prev ?? c.nights[0]);
      },
    );
  }, [viewerId]);

  const loadNight = useCallback(async () => {
    if (!night) return;
    const list = await repository.listEventsForNight(night);
    setEvents(list);
    setGoingCounts(await repository.getGoingCounts(list.map((e) => e.id)));
  }, [night]);

  useEffect(() => {
    void loadNight();
  }, [loadNight]);

  // Map init — once per conference load, torn down on unmount.
  useEffect(() => {
    const container = containerRef.current;
    if (!conference || !container || mapRef.current) return;

    const map = L.map(container, { zoomControl: false }).setView(
      [conference.venueLat, conference.venueLng],
      14,
    );
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.marker([conference.venueLat, conference.venueLng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="venue-pin"><div class="venue-pin-dot"></div></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
      interactive: false,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, [conference]);

  // Event pins re-render on every data change; the map itself never remounts.
  useEffect(() => {
    const layer = markersRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showTonight) return;

    for (const event of events) {
      const count = goingCounts[event.id] ?? 0;
      const selected = event.id === selectedEventId;
      const dark = sourceNeedsDarkText[event.source];
      const icon = L.divIcon({
        className: '',
        html: `<div class="map-pin${selected ? ' map-pin-selected' : ''}" style="background:${sourceColors[event.source]};color:${dark ? '#111111' : '#FFFFFF'}">${count > 0 ? count : ''}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker([event.lat, event.lng], { icon })
        .on('click', () => {
          setSelectedEventId(event.id);
          setOpenEventId(event.id);
        })
        .addTo(layer);
    }
  }, [events, goingCounts, selectedEventId, showTonight]);

  // Fit the night's slate plus the venue, leaving room for the floating chrome.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !conference || events.length === 0) return;
    const bounds = L.latLngBounds(
      events.map((e) => [e.lat, e.lng] as [number, number]),
    );
    bounds.extend([conference.venueLat, conference.venueLng]);
    map.fitBounds(bounds, {
      paddingTopLeft: [40, 150],
      paddingBottomRight: [40, 210],
    });
  }, [events, conference]);

  return (
    <div className="map-screen">
      <header className="map-header">
        <button className="back-button" onClick={goBack} aria-label="Close map">
          <Icon path={mdiChevronLeft} size={24} color={colors.text} />
        </button>
        <div className="map-header-text">
          <div className="map-title">Tonight Nearby</div>
          <div className="map-subtitle">{conference?.city ?? ''}</div>
        </div>
        <span className="back-button" />
      </header>

      <div className="map-wrap">
        <div ref={containerRef} className="map-container" />

        <div className="map-overlay-top">
          <div className="chip-row">
            <button
              className={showTonight ? 'chip chip-active' : 'chip'}
              onClick={() => setShowTonight((v) => !v)}
            >
              <Icon
                path={mdiWeatherNight}
                size={14}
                color={showTonight ? colors.textDark : colors.text}
              />
              Tonight
            </button>
          </div>

          {showTonight && conference ? (
            <div className="nights-row">
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
          ) : null}
        </div>

        {showTonight && events.length > 0 && conference ? (
          <div className="map-bottom">
            <div className="persona-row">
              <div className="persona-scroll">
                <span className="persona-label">Viewing as</span>
                {demoPersonaIds.map((id) => {
                  const person = attendeesById.get(id);
                  if (!person) return null;
                  return (
                    <button
                      key={id}
                      className={id === viewerId ? 'persona persona-active' : 'persona'}
                      onClick={() => setViewerId(id)}
                    >
                      {person.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
              <button
                className="host-button"
                onClick={() => setHosting(true)}
                aria-label="Host your own event"
              >
                <Icon path={mdiPlus} size={15} color={colors.textDark} />
                Host
              </button>
            </div>

            <div className="event-strip">
              {events.map((event) => {
                const going = goingCounts[event.id] ?? 0;
                const miles = milesBetween(
                  event.lat,
                  event.lng,
                  conference.venueLat,
                  conference.venueLng,
                );
                const selected = event.id === selectedEventId;
                return (
                  <button
                    key={event.id}
                    className={selected ? 'event-card event-card-selected' : 'event-card'}
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setOpenEventId(event.id);
                    }}
                  >
                    <span className="event-head">
                      <SourceBadge source={event.source} />
                      <span className="event-time">{formatTime(event.startsAt)}</span>
                    </span>
                    <span className="event-title">{event.title}</span>
                    <span className="event-meta">
                      {event.venueName} · {miles.toFixed(1)} mi
                    </span>
                    {/* Never render a literal "0 going" (DESIGN.md #8). */}
                    <span className="event-going">
                      {going > 0
                        ? `${going} attending`
                        : `Be the first from ${conference.name.split(' ')[0]}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {conference && viewer ? (
        <HostSheet
          visible={hosting}
          viewer={viewer}
          conference={conference}
          onClose={() => setHosting(false)}
          onSubmitted={() => void loadNight()}
        />
      ) : null}

      {conference && viewer ? (
        <EventSheet
          eventId={openEventId}
          viewer={viewer}
          conference={conference}
          onClose={() => setOpenEventId(null)}
          onRsvpChange={() => void loadNight()}
        />
      ) : null}
    </div>
  );
}
