import type { ReactNode } from 'react';
import { mdiChatProcessingOutline, mdiMagnify } from '@mdi/js';
import { openOverlay } from '../overlays';
import { Icon } from './../icons';
import { colors } from '../theme';

export function ScreenHeader({
  title,
  showSearch = false,
  center,
}: {
  title?: string;
  showSearch?: boolean;
  center?: ReactNode;
}) {
  return (
    <header className="screen-header">
      <div className="header-side" />
      <div className="header-center">
        {center ?? (title ? <span className="header-title">{title}</span> : null)}
      </div>
      <div className="header-side header-right">
        {showSearch ? (
          <button
            className="icon-button"
            aria-label="Search"
            onClick={() => openOverlay({ kind: 'search' })}
          >
            <Icon path={mdiMagnify} size={22} color="currentColor" />
          </button>
        ) : null}
        <button
          className="ai-chat-button"
          aria-label="Summit concierge"
          onClick={() => openOverlay({ kind: 'concierge' })}
        >
          <Icon path={mdiChatProcessingOutline} size={18} color={colors.textDark} />
        </button>
      </div>
    </header>
  );
}
