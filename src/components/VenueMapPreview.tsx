import { useMemo } from 'react';
import type { Conference } from '../offsite/domain/types';
import { PREVIEW_ZOOM, TILE_SIZE, buildTileMosaic } from '../mapTiles';

/**
 * The map behind More's Location card: a static mosaic of CARTO dark tiles
 * centred on the active conference's venue, with the map screen's venue pin on
 * top. Plain <img> tags, no Leaflet instance, no token — see src/mapTiles.ts.
 *
 * Rendered inside the card's <button>, so every element here is a span or an
 * img; a div would make the button's content model invalid.
 */

/**
 * The widest the card can get — .screen caps the shell at 480px — at the card's
 * own 804/506 aspect ratio. Sizing the mosaic to the largest card the layout
 * allows means one tile set for every device, so the URLs stay identical and
 * the second visit to More comes out of the browser cache. A narrower card
 * just crops the same mosaic.
 */
const CARD_WIDTH = 480;
const CARD_HEIGHT = Math.round((CARD_WIDTH * 506) / 804);

export function VenueMapPreview({ conference }: { conference: Conference }) {
  // Retina tiles are 512px of image drawn into 256 CSS px, which is what keeps
  // the preview crisp on a phone.
  const retina = typeof window !== 'undefined' && window.devicePixelRatio > 1;

  const mosaic = useMemo(
    () =>
      buildTileMosaic({
        lat: conference.venueLat,
        lng: conference.venueLng,
        zoom: PREVIEW_ZOOM,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        retina,
      }),
    [conference.venueLat, conference.venueLng, retina],
  );

  return (
    <>
      {/* Offset so the venue's pixel lands on the card's centre, where the pin is. */}
      <span
        className="location-map-tiles"
        aria-hidden="true"
        style={{
          width: mosaic.width,
          height: mosaic.height,
          left: `calc(50% - ${mosaic.venueX}px)`,
          top: `calc(50% - ${mosaic.venueY}px)`,
        }}
      >
        {mosaic.tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            width={TILE_SIZE}
            height={TILE_SIZE}
            draggable={false}
            style={{ left: tile.left, top: tile.top }}
          />
        ))}
      </span>

      <span className="location-map-pin venue-pin" aria-hidden="true">
        <span className="venue-pin-ring" />
        <span className="venue-pin-dot" />
      </span>
    </>
  );
}
