import type { ReactNode } from 'react';
import { mdiChatProcessingOutline, mdiMagnify } from '@mdi/js';
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
          <button className="icon-button" aria-label="Search">
            <Icon path={mdiMagnify} size={22} color={colors.text} />
          </button>
        ) : null}
        <button className="ai-chat-button" aria-label="AI assistant">
          <Icon path={mdiChatProcessingOutline} size={18} color={colors.textDark} />
        </button>
      </div>
    </header>
  );
}
