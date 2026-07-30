import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import L from 'leaflet';
import { mdiChevronLeft, mdiPlus } from '@mdi/js';
import { goBack } from '../App';
import { EventSheet } from '../components/EventSheet';
import { LiquidGlass } from '../components/LiquidGlass';
import { HostSheet } from '../components/HostSheet';
import { SourceBadge } from '../components/SourceBadge';
import type { Conference, OffsiteEvent } from '../offsite/domain/types';
import { getRepository } from '../offsite/data';
import { useActiveConferenceId } from '../offsite/activeConference';
import { nightLabels } from '../offsite/fixtures/conference';
import { milesBetween } from '../offsite/ingestion/curate';
import { useViewer } from '../offsite/viewerResolution';
import { formatTime, sourceColors, sourceLabels, sourceNeedsDarkText } from '../offsite/format';
import { CARTO_DARK_TILE_URL, CARTO_SUBDOMAINS, MAP_DEFAULT_ZOOM } from '../mapTiles';
import { Icon } from '../icons';
import { colors } from '../theme';

function fullNightLabel(night: string): string {
  const date = new Date(`${night}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? (nightLabels[night] ?? night)
    : new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        timeZone: 'UTC',
      }).format(date);
}

/**
 * The web port of the app's single map. Mapbox-in-a-WebView becomes Leaflet
 * with CARTO's dark basemap — no access token to ship, which is what lets the
 * demo run on any audience phone straight from the deployed URL. Nearby search
 * is the one mobile feature left out: it needs the Mapbox Search API.
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
  const markerRootsRef = useRef<Root[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);

  const activeConferenceId = useActiveConferenceId();
  const viewer = useViewer();
  const [conference, setConference] = useState<Conference | null>(null);
  const [night, setNight] = useState<string | null>(null);
  const [events, setEvents] = useState<OffsiteEvent[]>([]);
  const [goingCounts, setGoingCounts] = useState<Record<string, number>>({});
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [hosting, setHosting] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    void getRepository(activeConferenceId).getConference(activeConferenceId).then(
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
      const repo = getRepository(activeConferenceId);
      const list = await repo.listEventsForNight(activeConferenceId, night);
      setEvents(list);
      setGoingCounts(
        await repo.getGoingCounts(
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
      MAP_DEFAULT_ZOOM,
    );
    // Template, subdomains and opening zoom are shared with More's static
    // Location-card preview, so the card you tap and the screen it opens draw
    // the venue from the same tiles. See src/mapTiles.ts.
    L.tileLayer(CARTO_DARK_TILE_URL, {
      subdomains: CARTO_SUBDOMAINS,
      maxZoom: 19,
    }).addTo(map);

    const venueHost = document.createElement('div');
    const venueRoot = createRoot(venueHost);
    venueRoot.render(
      <span className="venue-pin">
        <LiquidGlass className="venue-pin-glass" frost={1} refraction={1.4} />
        <span className="venue-pin-ring" />
        <span className="venue-pin-dot" />
      </span>,
    );

    L.marker([conference.venueLat, conference.venueLng], {
      icon: L.divIcon({
        className: '',
        html: venueHost,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
      interactive: false,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      // This cleanup runs during React's commit. Defer the nested marker root
      // so React never tries to synchronously tear down one root from another.
      queueMicrotask(() => venueRoot.unmount());
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
    const previousRoots = markerRootsRef.current;
    markerRootsRef.current = [];
    queueMicrotask(() => previousRoots.forEach((root) => root.unmount()));
    layer.clearLayers();

    events.forEach((event, i) => {
      const count = goingCounts[event.id] ?? 0;
      const selected = event.id === selectedEventId;
      const dark = sourceNeedsDarkText[event.source];
      const color = sourceColors[event.source];
      const markerHost = document.createElement('div');
      const markerRoot = createRoot(markerHost);
      markerRoot.render(
        <span
          className="pin-drop"
          style={
            {
              animationDelay: `${i * 55}ms`,
              '--pin-color': color,
              '--pin-ink': dark ? '#07130f' : '#ffffff',
            } as CSSProperties
          }
        >
          {selected ? <span className="map-pin-halo" /> : null}
          <span className={selected ? 'map-pin map-pin-selected' : 'map-pin'}>
            <LiquidGlass
              className="map-pin-glass"
              frost={1}
              refraction={selected ? 1.8 : 1.35}
              wobble={selected ? event.id : undefined}
            />
            <span className="map-pin-count">{count > 0 ? count : ''}</span>
          </span>
        </span>,
      );
      markerRootsRef.current.push(markerRoot);

      const icon = L.divIcon({
        className: '',
        html: markerHost,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      L.marker([event.lat, event.lng], { icon, riseOnHover: true })
        .on('click', () => select(event.id, true))
        .addTo(layer);
    });

    return () => {
      const roots = markerRootsRef.current;
      markerRootsRef.current = [];
      queueMicrotask(() => roots.forEach((root) => root.unmount()));
    };
  }, [events, goingCounts, selectedEventId, select, mapReady]);

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
        <button
          className="back-button glass-button liquid-control"
          onClick={goBack}
          aria-label="Close map"
        >
          <LiquidGlass className="control-glass map-chrome-glass" />
          <Icon path={mdiChevronLeft} size={22} color={colors.text} />
        </button>
        <div className="map-header-text glass-panel liquid-control-surface">
          <LiquidGlass
            className="control-glass map-chrome-glass map-header-glass"
            frost={10}
            refraction={1.25}
          />
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
        {conference ? (
          <div className="nights-row" role="group" aria-label="Event days">
            {conference.nights.map((n) => (
              <button
                key={n}
                className={
                  n === night
                    ? 'night-chip night-chip-active liquid-control'
                    : 'night-chip liquid-control'
                }
                onClick={() => setNight(n)}
                aria-pressed={n === night}
              >
                <LiquidGlass
                  className="control-glass map-chrome-glass"
                  frost={3}
                  refraction={1.2}
                  wobble={night ?? undefined}
                />
                {fullNightLabel(n)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {events.length > 0 && conference ? (
        <div className="map-bottom">
          <div className="persona-row">
            <div className="persona-scroll">
              <span className="persona-label">
                You&apos;re {viewer?.name.split(' ')[0] ?? '…'}
              </span>
            </div>
            <button
              className="host-button liquid-control"
              onClick={() => setHosting(true)}
              aria-label="Host your own event"
            >
              <LiquidGlass className="control-glass" />
              <Icon path={mdiPlus} size={15} color="currentColor" />
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
                  className={
                    selected
                      ? 'event-card event-card-selected liquid-control'
                      : 'event-card liquid-control'
                  }
                  style={{
                    animationDelay: `${Math.min(i, 5) * 60}ms`,
                    ['--source-color' as string]: sourceColors[event.source],
                  }}
                  onClick={() => select(event.id, true, true)}
                >
                  <LiquidGlass className="control-glass event-card-glass" />
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
