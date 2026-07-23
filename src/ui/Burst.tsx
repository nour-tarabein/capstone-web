import type { CSSProperties } from 'react';

/**
 * A one-shot confetti pop for moments worth celebrating (an RSVP, game
 * points). Pure CSS particles — remount it (change `key`) to fire again.
 */
const PARTICLE_COLORS = ['#00E676', '#FF6B8A', '#4CC9F0', '#FFD166', '#8175EA'];

export function Burst({ count = 14 }: { count?: number }) {
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const distance = 46 + (i % 3) * 22;
        const style = {
          '--dx': `${Math.cos(angle) * distance}px`,
          '--dy': `${Math.sin(angle) * distance - 30}px`,
          '--rot': `${(i * 97) % 360}deg`,
          background: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
          animationDelay: `${(i % 4) * 30}ms`,
        } as CSSProperties;
        return <span key={i} className="burst-particle" style={style} />;
      })}
    </span>
  );
}
