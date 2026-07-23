import { useSyncExternalStore } from 'react';
import { Sheet } from './ui/Sheet';
import { SessionSheet } from './sheets/SessionSheet';
import { SearchSheet } from './sheets/SearchSheet';
import { ConciergeSheet } from './sheets/ConciergeSheet';
import { ExhibitorSheet } from './sheets/ExhibitorSheet';
import { AttendeesSheet, ProfileSheet, DMSheet } from './sheets/PeopleSheets';
import {
  ActivitySheet,
  AgendaSheet,
  AwardsSheet,
  BadgeSheet,
  ExitSheet,
  GamesSheet,
  OnDemandSheet,
  SpeakersSheet,
  SponsorsSheet,
  UpdatesSheet,
  WifiSheet,
} from './sheets/InfoSheets';

/**
 * A stack of bottom sheets that any screen can push onto — tapping a search
 * result opens a session sheet on top of the search sheet, and dismissing
 * peels one layer at a time, the way stacked sheets behave natively.
 */
export type Overlay =
  | { kind: 'search' }
  | { kind: 'concierge' }
  | { kind: 'session'; sessionId: string }
  | { kind: 'exhibitor'; exhibitorId: string }
  | { kind: 'attendees' }
  | { kind: 'profile'; attendeeId: string }
  | { kind: 'dm'; attendeeId: string }
  | { kind: 'speakers' }
  | { kind: 'sponsors' }
  | { kind: 'ondemand' }
  | { kind: 'games' }
  | { kind: 'activity' }
  | { kind: 'wifi' }
  | { kind: 'agenda' }
  | { kind: 'awards' }
  | { kind: 'updates' }
  | { kind: 'badge' }
  | { kind: 'exit' };

type Entry = Overlay & { key: number };

let stack: Entry[] = [];
let nextKey = 1;
const listeners = new Set<() => void>();

function emit() {
  stack = [...stack];
  listeners.forEach((l) => l());
}

export function openOverlay(overlay: Overlay) {
  stack.push({ ...overlay, key: nextKey++ });
  emit();
}

function remove(key: number) {
  stack = stack.filter((e) => e.key !== key);
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Tall sheets host their own scrolling lists; the rest hug their content. */
const TALL: ReadonlySet<Overlay['kind']> = new Set([
  'search',
  'concierge',
  'attendees',
  'activity',
  'dm',
]);

function content(entry: Entry) {
  switch (entry.kind) {
    case 'search':
      return <SearchSheet />;
    case 'concierge':
      return <ConciergeSheet />;
    case 'session':
      return <SessionSheet sessionId={entry.sessionId} />;
    case 'exhibitor':
      return <ExhibitorSheet exhibitorId={entry.exhibitorId} />;
    case 'attendees':
      return <AttendeesSheet />;
    case 'profile':
      return <ProfileSheet attendeeId={entry.attendeeId} />;
    case 'dm':
      return <DMSheet attendeeId={entry.attendeeId} />;
    case 'speakers':
      return <SpeakersSheet />;
    case 'sponsors':
      return <SponsorsSheet />;
    case 'ondemand':
      return <OnDemandSheet />;
    case 'games':
      return <GamesSheet />;
    case 'activity':
      return <ActivitySheet />;
    case 'wifi':
      return <WifiSheet />;
    case 'agenda':
      return <AgendaSheet />;
    case 'awards':
      return <AwardsSheet />;
    case 'updates':
      return <UpdatesSheet />;
    case 'badge':
      return <BadgeSheet />;
    case 'exit':
      return <ExitSheet />;
  }
}

export function OverlayHost() {
  const entries = useSyncExternalStore(subscribe, () => stack);
  return (
    <>
      {entries.map((entry) => (
        <Sheet
          key={entry.key}
          tall={TALL.has(entry.kind)}
          onClosed={() => remove(entry.key)}
        >
          {content(entry)}
        </Sheet>
      ))}
    </>
  );
}
