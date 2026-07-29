/**
 * Slippy-map tile arithmetic, shared by the map screen and the static preview
 * on More's Location card.
 *
 * The card can't hold a second Leaflet instance: tab screens are conditionally
 * mounted, so every visit to More would build and tear down a map, and a map
 * initialised in a container that isn't laid out yet is the classic grey-tiles
 * bug. Instead the card lays out a handful of plain <img> tiles. The URLs are
 * the same for every device and every render, so a second visit to More is
 * served from the browser cache; and because they come from the template and
 * opening zoom the map screen uses, the card looks like the screen it opens.
 */

/** The map screen's basemap. Both surfaces read it from here so they can't drift. */
export const CARTO_DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const CARTO_SUBDOMAINS = 'abcd';
export const TILE_SIZE = 256;

/**
 * The zoom the map screen opens the venue at, and therefore the zoom the card
 * previews it at — tapping through starts from the scale the card just showed.
 * (The map screen then fits the night's events, so it moves from here.)
 */
export const MAP_DEFAULT_ZOOM = 14;

/**
 * The Location card at its largest: the shell caps screens at 480px
 * (styles.css `.shell`) and the card is 804/506 (styles.css
 * `.location-map-card`). Sizing the mosaic to the biggest card the layout
 * allows means one tile set for every device — identical URLs, so the cache
 * works — and a narrower card simply crops the same mosaic.
 */
export const PREVIEW_CARD_WIDTH = 480;
export const PREVIEW_CARD_HEIGHT = Math.round((PREVIEW_CARD_WIDTH * 506) / 804);

/** Web Mercator stops here; past it the projection runs off to infinity. */
const MAX_LATITUDE = 85.0511287798;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Position in the zoom level's pixel plane, where the whole world is
 * TILE_SIZE * 2^zoom pixels square with 0,0 at the north-west corner.
 */
export function worldPixelsFor(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const sin = Math.sin((clamp(lat, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180);
  return {
    x: clamp(((lng + 180) / 360) * scale, 0, scale),
    y: clamp((0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale, 0, scale),
  };
}

/** The tile that contains a coordinate. */
export function tileIndexFor(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const last = 2 ** zoom - 1;
  const world = worldPixelsFor(lat, lng, zoom);
  return {
    x: Math.min(last, Math.floor(world.x / TILE_SIZE)),
    y: Math.min(last, Math.floor(world.y / TILE_SIZE)),
  };
}

/**
 * Leaflet's subdomain rotation, repeated so a tile the map screen has already
 * fetched is served from the same host here and hits the browser cache.
 */
export function tileUrl({
  x,
  y,
  zoom,
  retina,
}: {
  x: number;
  y: number;
  zoom: number;
  retina: boolean;
}): string {
  const subdomain = CARTO_SUBDOMAINS[Math.abs(x + y) % CARTO_SUBDOMAINS.length];
  return CARTO_DARK_TILE_URL.replace('{s}', subdomain)
    .replace('{z}', String(zoom))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{r}', retina ? '@2x' : '');
}

export type MosaicTile = {
  /** Stable across re-renders, so React reuses the <img> and the browser its cache. */
  key: string;
  url: string;
  left: number;
  top: number;
};

export type TileMosaic = {
  tiles: MosaicTile[];
  cols: number;
  rows: number;
  width: number;
  height: number;
  /** Where the venue sits inside the mosaic — the card offsets by this to centre it. */
  venueX: number;
  venueY: number;
};

/**
 * A grid of tiles big enough to fill a width × height card with the venue at
 * its centre.
 *
 * The grid is always odd × odd and centred on the venue's own tile, which puts
 * the venue within half a tile of the mosaic's middle and leaves at least
 * half a card of map on every side.
 */
export function buildTileMosaic({
  lat,
  lng,
  zoom,
  width,
  height,
  retina,
}: {
  lat: number;
  lng: number;
  zoom: number;
  width: number;
  height: number;
  retina: boolean;
}): TileMosaic {
  const last = 2 ** zoom - 1;
  const wrap = 2 ** zoom;
  const world = worldPixelsFor(lat, lng, zoom);
  const centre = tileIndexFor(lat, lng, zoom);

  const halfCols = Math.ceil(width / 2 / TILE_SIZE);
  const halfRows = Math.ceil(height / 2 / TILE_SIZE);
  const cols = halfCols * 2 + 1;
  const rows = halfRows * 2 + 1;
  const originX = centre.x - halfCols;
  const originY = centre.y - halfRows;

  const tiles: MosaicTile[] = [];
  for (let row = 0; row < rows; row++) {
    const y = originY + row;
    // Longitude wraps, latitude doesn't: a row off the top or bottom of the
    // world has no tile to show, so the card's dark background stands in.
    if (y < 0 || y > last) continue;
    for (let col = 0; col < cols; col++) {
      const x = ((((originX + col) % wrap) + wrap) % wrap);
      tiles.push({
        key: `${zoom}/${x}/${y}`,
        url: tileUrl({ x, y, zoom, retina }),
        left: col * TILE_SIZE,
        top: row * TILE_SIZE,
      });
    }
  }

  return {
    tiles,
    cols,
    rows,
    width: cols * TILE_SIZE,
    height: rows * TILE_SIZE,
    venueX: world.x - originX * TILE_SIZE,
    venueY: world.y - originY * TILE_SIZE,
  };
}
