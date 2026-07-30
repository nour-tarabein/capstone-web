import type { ReactNode } from 'react';
import { mdiChatProcessingOutline, mdiMagnify } from '@mdi/js';
import { openOverlay } from '../overlays';
import { Icon } from './../icons';
import { LiquidGlass } from './LiquidGlass';
import { LiquidButton } from './LiquidButton';

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
      <LiquidGlass className="screen-header-glass" frost={10} />
      <div className="header-side" />
      <div className="header-center">
        {center ?? (title ? <span className="header-title">{title}</span> : null)}
      </div>
      <div className="header-side header-right">
        {showSearch ? (
          <LiquidButton
            className="icon-button"
            aria-label="Search"
            onClick={() => openOverlay({ kind: 'search' })}
          >
            <Icon path={mdiMagnify} size={22} color="currentColor" />
          </LiquidButton>
        ) : null}
        <LiquidButton
          className="ai-chat-button"
          aria-label="Summit concierge"
          onClick={() => openOverlay({ kind: 'concierge' })}
        >
          <Icon path={mdiChatProcessingOutline} size={18} color="currentColor" />
        </LiquidButton>
      </div>
    </header>
  );
}
