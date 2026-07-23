import type { EventSource } from '../offsite/domain/types';
import { sourceColors, sourceIcons, sourceLabels } from '../offsite/format';

/**
 * Shows the platform's own mark next to its name. The icons are 32px favicons
 * with baked-in dark backgrounds — no alpha — so they are clipped to a rounded
 * square rather than floated on the surface, which would show a hard edge.
 */
export function SourceBadge({ source }: { source: EventSource }) {
  const color = sourceColors[source];
  const icon = sourceIcons[source];

  return (
    <span className="source-badge" style={{ backgroundColor: `${color}1F` }}>
      {icon ? <img src={icon} alt="" className="source-badge-icon" /> : null}
      <span className="source-badge-text" style={{ color }}>
        {sourceLabels[source].toUpperCase()}
      </span>
    </span>
  );
}
