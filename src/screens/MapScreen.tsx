import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { mdiChevronLeft, mdiPlus, mdiWeatherNight } from '@mdi/js';
import { goBack } from '../App';
import { EventSheet } from '../components/EventSheet';
import { HostSheet } from '../components/HostSheet';
import { SourceBadge } from '../components/SourceBadge';
import type { Conference, OffsiteEvent } from '../offsite/domain/types';
import { repository } from '../offsite/data';
import { useActiveConferenceId } from '../offsite/activeConference';
import { nightLabels } from '../offsite/fixtures/conference';
import { milesBetween } from '../offsite/ingestion/curate';
import { useViewerId } from '../offsite/persona';
import { useActiveRoster } from '../offsite/roster';
import { formatTime, sourceColors, sourceLabels, sourceNeedsDarkText } from '../offsite/format';
import { Icon } from '../icons';
import { colors } from '../theme';

/**
 * The web port of the app's single map. Mapbox-in-a-WebView becomes Leaflet
 * with CARTO's dark basemap — no access token to ship, which is what lets the
 * demo run on any audience phone straight from GitHub Pages. Nearby search is
 * the one mobile feature left out: it needs the Mapbox Search API.
 *
 * All chrome floats in glass layers over a full-bleed map; selection is
 * two-way (pin ↔ card) with the strip auto-scrolling to follow pin taps.
 */
/**
 * Open on tonight when the demo is running during the conference, so a
 * presenter on day 2 lands on day 2 instead of the first night.
 */
function defaultNight(nights: string[]): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
  }).format(new Date());
  return nights.includes(today) ? today : nights[0];
}

export function MapScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const viewerId = useViewerId();
  const activeConferenceId = useActiveConferenceId();
  // Local roster is source of truth for who "you" are — avoids a stale
  // Supabase seed (e.g. old a3 = Priya) overriding the Cvent roster.
  const { attendeesById } = useActiveRoster();
  const viewer = attendeesById.get(viewerId) ?? null;
  const [conference, setConference] = useState<Conference | null>(null);
  const [night, setNight] = useState<string | null>(null);
  const [events, setEvents] = useState<OffsiteEvent[]>([]);
  const [goingCounts, setGoingCounts] = useState<Record<string, number>>({});
  const [showTonight, setShowTonight] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [hosting, setHosting] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    void repository.getConference(activeConferenceId).then(
      (c) => {
        setConference(c);
        setNight(defaultNight(c.nights));
      },
      (err: unknown) => console.error('[map] getConference failed', err),
    );
  }, [activeConferenceId]);

  const loadNight = useCallback(async () => {
    if (!night) return;
    try {
      const list = await repository.listEventsForNight(activeConferenceId, night);
      setEvents(list);
      setGoingCounts(
        await repository.getGoingCounts(
          activeConferenceId,
          list.map((e) => e.id),
        ),
      );
    } catch (err) {
      console.error('[map] listEventsForNight failed', err);
      setEvents([]);
    }
  }, [activeConferenceId, night]);

  useEffect(() => {
    void loadNight();
  }, [loadNight]);

  // Map init — once per conference load, torn down on unmount.
  useEffect(() => {
    const container = containerRef.current;
    if (!conference || !container || mapRef.current) return;

    const map = L.map(container, { zoomControl: false, attributionControl: false }).setView(
      [conference.venueLat, conference.venueLng],
      14,
    );
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.marker([conference.venueLat, conference.venueLng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="venue-pin"><div class="venue-pin-ring"></div><div class="venue-pin-dot"></div></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
      interactive: false,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      setMapReady(false);
    };
  }, [conference]);

  const select = useCallback((eventId: string, open: boolean, centerPin = false) => {
    setSelectedEventId(eventId);
    if (open) setOpenEventId(eventId);

    if (centerPin) {
      const map = mapRef.current;
      const event = events.find((candidate) => candidate.id === eventId);
      if (map && event) {
        const size = map.getSize();
        const pinPoint = map.latLngToContainerPoint([event.lat, event.lng]);
        // The event sheet covers the lower half of the screen. Center the pin
        // in the map area that remains visible between it and the top chrome.
        const visibleMapCenter = L.point(size.x / 2, size.y * 0.32);
        map.panBy(pinPoint.subtract(visibleMapCenter), {
          animate: true,
          duration: 0.35,
          easeLinearity: 0.25,
        });
      }
    }

    // Bring the matching strip card into view when a pin is tapped.
    stripRef.current
      ?.querySelector(`[data-event-id="${eventId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [events]);

  // Event pins re-render on every data change; the map itself never remounts.
  // Include mapReady so the first events response isn't dropped if it lands
  // before the Leaflet layer exists.
  useEffect(() => {
    const layer = markersRef.current;
    if (!layer || !mapReady) return;
    layer.clearLayers();
    if (!showTonight) return;

    events.forEach((event, i) => {
      const count = goingCounts[event.id] ?? 0;
      const selected = event.id === selectedEventId;
      const dark = sourceNeedsDarkText[event.source];
      const color = sourceColors[event.source];
      const icon = L.divIcon({
        className: '',
        html:
          `<div class="pin-drop" style="animation-delay:${i * 55}ms">` +
          (selected ? `<div class="map-pin-halo" style="background:${color}"></div>` : '') +
          `<div class="map-pin${selected ? ' map-pin-selected' : ''}" ` +
          `style="background:${color};color:${dark ? '#111111' : '#FFFFFF'};--pin-glow:${color}66">` +
          `${count > 0 ? count : ''}</div></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      L.marker([event.lat, event.lng], { icon, riseOnHover: true })
        .on('click', () => select(event.id, true))
        .addTo(layer);
    });
  }, [events, goingCounts, selectedEventId, showTonight, select, mapReady]);

  // Fit the night's slate plus the venue, leaving room for the floating chrome.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !conference || events.length === 0) return;
    const bounds = L.latLngBounds(
      events.map((e) => [e.lat, e.lng] as [number, number]),
    );
    bounds.extend([conference.venueLat, conference.venueLng]);
    map.fitBounds(bounds, {
      paddingTopLeft: [40, 170],
      paddingBottomRight: [40, 230],
    });
  }, [events, conference]);

  const openEvent = openEventId ? events.find((e) => e.id === openEventId) : null;

  return (
    <div className="map-screen">
      <div ref={containerRef} className="map-container" />

      <header className="map-header">
        <button className="back-button glass-button" onClick={goBack} aria-label="Close map">
          <Icon path={mdiChevronLeft} size={22} color={colors.text} />
        </button>
        <div className="map-header-text glass-panel">
          <div className="map-title">Tonight Nearby</div>
          <div className="map-subtitle">
            {conference
              ? `${conference.city} · ${events.length} event${events.length === 1 ? '' : 's'}`
              : 'Loading…'}
          </div>
        </div>
        <span className="back-button" />
      </header>

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
              <span className="persona-label">
                You&apos;re {viewer?.name.split(' ')[0] ?? '…'}
              </span>
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

          <div className="event-strip" ref={stripRef}>
            {events.map((event, i) => {
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
                  data-event-id={event.id}
                  className={selected ? 'event-card event-card-selected' : 'event-card'}
                  style={{
                    animationDelay: `${Math.min(i, 5) * 60}ms`,
                    ['--source-color' as string]: sourceColors[event.source],
                  }}
                  onClick={() => select(event.id, true, true)}
                >
                  <span className="event-card-body">
                    <span className="event-head">
                      <SourceBadge source={event.source} />
                      <span className="event-time">{formatTime(event.startsAt)}</span>
                    </span>
                    <span className="event-title">{event.title}</span>
                    <span className="event-meta">
                      {event.venueName}
                      {miles < 0.05 ? '' : ` · ${miles.toFixed(1)} mi`}
                    </span>
                    {/* Never render a literal "0 going" (DESIGN.md #8).
                        Summit RSVPs and the platform's public crowd are kept
                        separate — externalGoingCount names nobody. */}
                    <span className={going > 0 ? 'event-going' : 'event-going event-going-first'}>
                      {going > 0 ? (
                        <>
                          <span className="going-dot" />
                          {going} attending
                        </>
                      ) : (
                        `Be the first from ${conference.name.split(' ')[0]}`
                      )}
                    </span>
                    {event.externalGoingCount ? (
                      <span className="event-external">
                        + {event.externalGoingCount.toLocaleString()} on{' '}
                        {sourceLabels[event.source]}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {hosting && conference && viewer ? (
        <HostSheet
          viewer={viewer}
          conference={conference}
          onClose={() => setHosting(false)}
          onSubmitted={() => void loadNight()}
        />
      ) : null}

      {openEvent && conference && viewer ? (
        <EventSheet
          eventId={openEvent.id}
          viewer={viewer}
          conference={conference}
          onClose={() => setOpenEventId(null)}
          onRsvpChange={() => void loadNight()}
        />
      ) : null}
    </div>
  );
}
