import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

/**
 * Liquid glass with real refraction, ported from samasante/liquid-glass:
 * a canvas-rendered displacement map (R = x offset, G = y offset) drives an
 * SVG feDisplacementMap that the browser applies to the element's *backdrop*
 * via `backdrop-filter: url(#...)` — whatever scrolls behind the surface
 * bends at the edges like it's under curved glass.
 *
 * Only Chromium applies SVG filter references inside backdrop-filter; Safari
 * and Firefox parse them but render nothing, so they get a frosted-blur
 * fallback instead. iOS Chrome (CriOS) is WebKit and falls back too.
 */
const canRefract =
  typeof window !== 'undefined' &&
  typeof CSS !== 'undefined' &&
  CSS.supports('backdrop-filter', 'url(#x)') &&
  /Chrom(e|ium)/.test(navigator.userAgent);

function smoothStep(a: number, b: number, t: number): number {
  const x = Math.min(Math.max((t - a) / (b - a), 0), 1);
  return x * x * (3 - 2 * x);
}

/** Signed distance to a rounded rectangle, in centered UV space. */
function roundedRectSDF(x: number, y: number, width: number, height: number, radius: number): number {
  const qx = Math.abs(x) - width + radius;
  const qy = Math.abs(y) - height + radius;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
}

type DisplacementMap = { url: string; scale: number; width: number; height: number };

/**
 * Renders the lens as an image: each pixel's R/G channels encode how far the
 * backdrop should be pulled toward the center at that point. The center stays
 * flat (no displacement) and the pull ramps up through the edge band, which is
 * what reads as refraction through a curved rim.
 */
function buildDisplacementMap(width: number, height: number): DisplacementMap | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const raw = new Float32Array(width * height * 2);
  let maxScale = 0;
  for (let i = 0; i < width * height; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    const ix = x / width - 0.5;
    const iy = y / height - 0.5;
    const sdf = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
    const push = smoothStep(0, 1, smoothStep(0.8, 0, sdf - 0.15));
    const dx = (ix * push + 0.5) * width - x;
    const dy = (iy * push + 0.5) * height - y;
    maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
    raw[i * 2] = dx;
    raw[i * 2 + 1] = dy;
  }
  if (maxScale === 0) maxScale = 1;

  // feDisplacementMap offsets by scale * (channel - 0.5), so encode each axis
  // as channel = dx / (2 * maxScale) + 0.5 and set scale = 2 * maxScale.
  const image = ctx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    image.data[i * 4] = (raw[i * 2] / maxScale) * 127.5 + 127.5;
    image.data[i * 4 + 1] = (raw[i * 2 + 1] / maxScale) * 127.5 + 127.5;
    image.data[i * 4 + 2] = 127;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return { url: canvas.toDataURL(), scale: 2 * maxScale, width, height };
}

/**
 * A glass surface layer. Position it (usually absolutely) behind content; it
 * refracts whatever is painted beneath it. The displacement map is rebuilt
 * whenever the element's size changes.
 */
/** Damped ring: starts overshot, oscillates through 1.5 cycles, settles at 1. */
function wobbleCurve(t: number): number {
  return 1 + 1.4 * Math.exp(-5 * t) * Math.cos(3 * Math.PI * t);
}

const WOBBLE_MS = 550;

export function LiquidGlass({
  className,
  style,
  frost = 1,
  refraction = 1,
  wobble,
}: {
  className?: string;
  style?: CSSProperties;
  /** Blur (px) layered under the refraction — raise it when sharp backdrop
      content would fight the foreground (sheets, headers). */
  frost?: number;
  /** Multiplies how far the backdrop bends at the rim. 1 is the tuned default
      for small chrome; raise it on large surfaces, where the same displacement
      spread over a longer edge otherwise reads as flat. */
  refraction?: number;
  /** When this value changes, the refraction briefly overshoots and rings
      down — the glass "settles". Pass e.g. the active tab id. */
  wobble?: string | number;
}) {
  const filterId = `lg-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<DisplacementMap | null>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const mapRef = useRef<DisplacementMap | null>(null);
  mapRef.current = map;
  // Read through a ref so changing the strength doesn't re-trigger a wobble.
  const refractionRef = useRef(refraction);
  refractionRef.current = refraction;
  const wobbledOnce = useRef(false);

  useEffect(() => {
    if (!canRefract) return;
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = Math.round(el.clientWidth);
        const height = Math.round(el.clientHeight);
        if (width <= 0 || height <= 0) return;
        setMap((prev) =>
          prev && prev.width === width && prev.height === height
            ? prev
            : buildDisplacementMap(width, height),
        );
      });
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (wobble === undefined) return;
    // The mount-time value isn't a change — only wobble on later switches.
    if (!wobbledOnce.current) {
      wobbledOnce.current = true;
      return;
    }
    const current = mapRef.current;
    const el = dispRef.current;
    if (!current || !el) return;
    const settled = current.scale * refractionRef.current;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const t = Math.min((now - start) / WOBBLE_MS, 1);
      el.setAttribute('scale', String(settled * (t < 1 ? wobbleCurve(t) : 1)));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      el.setAttribute('scale', String(settled));
    };
  }, [wobble]);

  const backdropFilter = map
    ? `url(#${filterId}) blur(${frost}px) brightness(1.06) saturate(1.3)`
    : `blur(${Math.max(frost, 16)}px) saturate(1.5)`;

  return (
    <span
      ref={ref}
      className={className}
      aria-hidden="true"
      style={{ ...style, backdropFilter, WebkitBackdropFilter: backdropFilter }}
    >
      {map ? (
        <svg className="liquid-glass-defs" width="0" height="0" aria-hidden="true">
          <defs>
            <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feImage href={map.url} x="0" y="0" width={map.width} height={map.height} result="map" />
              <feDisplacementMap
                ref={dispRef}
                in="SourceGraphic"
                in2="map"
                scale={map.scale * refraction}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      ) : null}
    </span>
  );
}
