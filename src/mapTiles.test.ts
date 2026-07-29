import { describe, expect, it } from 'vitest';
import {
  CARTO_DARK_TILE_URL,
  CARTO_SUBDOMAINS,
  TILE_SIZE,
  buildTileMosaic,
  tileIndexFor,
  tileUrl,
  worldPixelsFor,
} from './mapTiles';
import { conference, tysonsConference } from './offsite/fixtures/conference';

/**
 * Independent restatement of the slippy-map projection, written with the
 * tan/sec form instead of the log/sin form the implementation uses. If the two
 * disagree, one of them is wrong.
 */
function referenceTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom;
  const rad = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lng + 180) / 360) * n),
    y: Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n),
  };
}

describe('tileIndexFor', () => {
  it('puts the whole world in tile 0/0 at zoom 0', () => {
    expect(tileIndexFor(conference.venueLat, conference.venueLng, 0)).toEqual({ x: 0, y: 0 });
  });

  it('splits the world into quadrants at zoom 1', () => {
    expect(tileIndexFor(10, -10, 1)).toEqual({ x: 0, y: 0 });
    expect(tileIndexFor(10, 10, 1)).toEqual({ x: 1, y: 0 });
    expect(tileIndexFor(-10, -10, 1)).toEqual({ x: 0, y: 1 });
    expect(tileIndexFor(-10, 10, 1)).toEqual({ x: 1, y: 1 });
  });

  it('maps the Austin venue to its known tile', () => {
    expect(tileIndexFor(conference.venueLat, conference.venueLng, 15)).toEqual({
      x: 7487,
      y: 13491,
    });
  });

  it('maps the McLean venue to its known tile', () => {
    expect(tileIndexFor(tysonsConference.venueLat, tysonsConference.venueLng, 15)).toEqual({
      x: 9354,
      y: 12532,
    });
  });

  it('agrees with the reference projection for both venues at every preview zoom', () => {
    for (const venue of [conference, tysonsConference]) {
      for (const zoom of [12, 13, 14, 15, 16]) {
        expect(tileIndexFor(venue.venueLat, venue.venueLng, zoom)).toEqual(
          referenceTile(venue.venueLat, venue.venueLng, zoom),
        );
      }
    }
  });

  it('gives the two conferences different tiles, so each card shows its own venue', () => {
    const austin = tileIndexFor(conference.venueLat, conference.venueLng, 15);
    const mclean = tileIndexFor(tysonsConference.venueLat, tysonsConference.venueLng, 15);
    expect(austin).not.toEqual(mclean);
  });

  it('clamps latitudes beyond the Mercator limit into the tile grid', () => {
    expect(tileIndexFor(89.9, 0, 2)).toEqual({ x: 2, y: 0 });
    expect(tileIndexFor(-89.9, 0, 2)).toEqual({ x: 2, y: 3 });
  });
});

describe('worldPixelsFor', () => {
  it('places the antimeridian corner at pixel 0,0', () => {
    const { x } = worldPixelsFor(0, -180, 3);
    expect(x).toBe(0);
  });

  it('places the equator at the vertical middle of the world', () => {
    const scale = TILE_SIZE * 2 ** 4;
    expect(worldPixelsFor(0, 0, 4)).toEqual({ x: scale / 2, y: scale / 2 });
  });

  it('doubles with every zoom level', () => {
    const a = worldPixelsFor(conference.venueLat, conference.venueLng, 14);
    const b = worldPixelsFor(conference.venueLat, conference.venueLng, 15);
    expect(b.x).toBeCloseTo(a.x * 2, 6);
    expect(b.y).toBeCloseTo(a.y * 2, 6);
  });
});

describe('tileUrl', () => {
  it('fills the map screen template rather than a template of its own', () => {
    expect(tileUrl({ x: 7487, y: 13491, zoom: 15, retina: false })).toBe(
      CARTO_DARK_TILE_URL.replace('{s}', 'c')
        .replace('{z}', '15')
        .replace('{x}', '7487')
        .replace('{y}', '13491')
        .replace('{r}', ''),
    );
  });

  it('is the CARTO dark basemap the map screen loads', () => {
    expect(CARTO_DARK_TILE_URL).toBe(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    );
    expect(CARTO_SUBDOMAINS).toBe('abcd');
  });

  it('asks for retina tiles on a high-DPI screen', () => {
    expect(tileUrl({ x: 7487, y: 13491, zoom: 15, retina: true })).toContain('/13491@2x.png');
    expect(tileUrl({ x: 7487, y: 13491, zoom: 15, retina: false })).toContain('/13491.png');
  });

  it('spreads tiles across the subdomains the way Leaflet does', () => {
    const subdomainOf = (url: string) => url.slice('https://'.length)[0];
    expect(subdomainOf(tileUrl({ x: 0, y: 0, zoom: 15, retina: false }))).toBe('a');
    expect(subdomainOf(tileUrl({ x: 1, y: 0, zoom: 15, retina: false }))).toBe('b');
    expect(subdomainOf(tileUrl({ x: 2, y: 1, zoom: 15, retina: false }))).toBe('d');
    expect(subdomainOf(tileUrl({ x: 4, y: 0, zoom: 15, retina: false }))).toBe('a');
  });
});

describe('buildTileMosaic', () => {
  const card = { width: 480, height: 302 };
  const austin = buildTileMosaic({
    lat: conference.venueLat,
    lng: conference.venueLng,
    zoom: 15,
    ...card,
    retina: false,
  });

  it('covers the card with a whole number of tiles', () => {
    expect(austin.width).toBe(austin.cols * TILE_SIZE);
    expect(austin.height).toBe(austin.rows * TILE_SIZE);
    expect(austin.tiles).toHaveLength(austin.cols * austin.rows);
    expect(austin.width).toBeGreaterThanOrEqual(card.width);
    expect(austin.height).toBeGreaterThanOrEqual(card.height);
  });

  it('centres the venue within the mosaic to within half a tile', () => {
    expect(Math.abs(austin.venueX - austin.width / 2)).toBeLessThanOrEqual(TILE_SIZE / 2);
    expect(Math.abs(austin.venueY - austin.height / 2)).toBeLessThanOrEqual(TILE_SIZE / 2);
  });

  it('leaves map on all four sides of the card once the venue is centred', () => {
    // The card is drawn with the venue at its centre, so the mosaic has to
    // reach half a card past the venue in every direction or a corner of the
    // card falls off the mosaic and shows bare background.
    expect(austin.venueX).toBeGreaterThanOrEqual(card.width / 2);
    expect(austin.width - austin.venueX).toBeGreaterThanOrEqual(card.width / 2);
    expect(austin.venueY).toBeGreaterThanOrEqual(card.height / 2);
    expect(austin.height - austin.venueY).toBeGreaterThanOrEqual(card.height / 2);
  });

  it('lays the tiles out on a grid with no gaps or overlaps', () => {
    const lefts = [...new Set(austin.tiles.map((t) => t.left))].sort((a, b) => a - b);
    const tops = [...new Set(austin.tiles.map((t) => t.top))].sort((a, b) => a - b);
    expect(lefts).toEqual(Array.from({ length: austin.cols }, (_, i) => i * TILE_SIZE));
    expect(tops).toEqual(Array.from({ length: austin.rows }, (_, i) => i * TILE_SIZE));
  });

  it('centres the mosaic on the tile holding the venue', () => {
    const centre = tileIndexFor(conference.venueLat, conference.venueLng, 15);
    const centreTile = austin.tiles.find(
      (t) => t.left === ((austin.cols - 1) / 2) * TILE_SIZE
        && t.top === ((austin.rows - 1) / 2) * TILE_SIZE,
    );
    expect(centreTile?.url).toBe(tileUrl({ ...centre, zoom: 15, retina: false }));
  });

  it('shows a different set of tiles for the other conference', () => {
    const mclean = buildTileMosaic({
      lat: tysonsConference.venueLat,
      lng: tysonsConference.venueLng,
      zoom: 15,
      ...card,
      retina: false,
    });
    const austinUrls = new Set(austin.tiles.map((t) => t.url));
    expect(mclean.tiles.some((t) => austinUrls.has(t.url))).toBe(false);
  });

  it('is deterministic, so revisiting the tab re-requests cached URLs', () => {
    const again = buildTileMosaic({
      lat: conference.venueLat,
      lng: conference.venueLng,
      zoom: 15,
      ...card,
      retina: false,
    });
    expect(again).toEqual(austin);
  });

  it('requests retina tiles for the whole mosaic on a high-DPI screen', () => {
    const retina = buildTileMosaic({
      lat: conference.venueLat,
      lng: conference.venueLng,
      zoom: 15,
      ...card,
      retina: true,
    });
    expect(retina.tiles.every((t) => t.url.includes('@2x.png'))).toBe(true);
    expect(retina.width).toBe(austin.width);
  });

  it('wraps tile columns across the antimeridian instead of requesting negative x', () => {
    const dateline = buildTileMosaic({
      lat: 0,
      lng: -179.99,
      zoom: 2,
      ...card,
      retina: false,
    });
    expect(dateline.tiles.every((t) => /\/2\/\d+\/\d+/.test(t.url))).toBe(true);
    expect(dateline.tiles.some((t) => t.url.includes('/2/3/'))).toBe(true);
  });

  it('drops rows that fall off the top or bottom of the world', () => {
    const pole = buildTileMosaic({ lat: 85, lng: 0, zoom: 2, ...card, retina: false });
    expect(pole.tiles.length).toBeLessThan(pole.cols * pole.rows);
    expect(pole.tiles.every((t) => t.top >= 0)).toBe(true);
  });
});
