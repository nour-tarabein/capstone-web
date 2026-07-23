import { useSyncExternalStore } from 'react';
import { mdiMapMarkerOutline, mdiStar, mdiStarOutline } from '@mdi/js';
import { exhibitorsById } from '../data/mock';
import { initials } from '../offsite/format';
import { toast } from '../ui/toast';
import { Icon } from '../icons';
import { colors } from '../theme';

/** Favourites survive closing the sheet (but not a refresh, like all demo
 *  state) so a starred booth stays starred while the audience explores. */
const favorites = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function toggleFavorite(id: string) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  version++;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useFavoriteVersion() {
  return useSyncExternalStore(subscribe, () => version);
}

export function isFavorite(id: string) {
  return favorites.has(id);
}

export function ExhibitorSheet({ exhibitorId }: { exhibitorId: string }) {
  useFavoriteVersion();
  const exhibitor = exhibitorsById.get(exhibitorId);
  if (!exhibitor) return null;
  const fav = favorites.has(exhibitor.id);

  return (
    <div>
      <div className="exhibitor-sheet-head">
        <span className="exhibitor-logo exhibitor-logo-lg">
          {initials(exhibitor.name)}
        </span>
        <div>
          <div className="sheet-title profile-sheet-name">{exhibitor.name}</div>
          <div className="sheet-meta">
            <Icon path={mdiMapMarkerOutline} size={14} color={colors.textSecondary} />{' '}
            Booth {exhibitor.booth}
            {exhibitor.sponsorship ? ` · ${exhibitor.sponsorship} sponsor` : ''}
          </div>
        </div>
      </div>

      <p className="sheet-description">{exhibitor.blurb}</p>

      <button
        className={fav ? 'rsvp-button rsvp-going' : 'rsvp-button'}
        onClick={() => {
          toggleFavorite(exhibitor.id);
          toast(
            favorites.has(exhibitor.id)
              ? `${exhibitor.name} saved to favorites`
              : `${exhibitor.name} removed from favorites`,
          );
        }}
      >
        <Icon
          path={fav ? mdiStar : mdiStarOutline}
          size={17}
          color={fav ? colors.green : colors.textDark}
        />
        {fav ? 'Saved to favorites' : 'Save to favorites'}
      </button>
    </div>
  );
}
