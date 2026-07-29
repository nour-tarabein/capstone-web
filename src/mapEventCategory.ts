import {
  mdiGamepadVariantOutline,
  mdiGlassCocktail,
  mdiHandshakeOutline,
  mdiMusic,
  mdiPartyPopper,
  mdiRun,
  mdiSilverwareForkKnife,
} from '@mdi/js';
import type { OffsiteEvent } from './offsite/domain/types';

export type MapEventCategory =
  | 'drinks'
  | 'food'
  | 'fitness'
  | 'games'
  | 'music'
  | 'networking'
  | 'social';

interface CategoryPresentation {
  kind: MapEventCategory;
  label: string;
  iconPath: string;
}

const presentations: Record<MapEventCategory, CategoryPresentation> = {
  drinks: { kind: 'drinks', label: 'Drinks', iconPath: mdiGlassCocktail },
  food: { kind: 'food', label: 'Food', iconPath: mdiSilverwareForkKnife },
  fitness: { kind: 'fitness', label: 'Fitness or outdoors', iconPath: mdiRun },
  games: { kind: 'games', label: 'Games', iconPath: mdiGamepadVariantOutline },
  music: { kind: 'music', label: 'Music or dancing', iconPath: mdiMusic },
  networking: { kind: 'networking', label: 'Networking', iconPath: mdiHandshakeOutline },
  social: { kind: 'social', label: 'Social', iconPath: mdiPartyPopper },
};

const signals: Array<{ kind: Exclude<MapEventCategory, 'social'>; terms: string[] }> = [
  {
    kind: 'fitness',
    terms: ['5k', ' run ', 'running', 'swim', 'trail', 'workout', 'yoga', 'hike'],
  },
  {
    kind: 'games',
    terms: ['board game', 'game night', 'trivia', 'arcade', 'wingspan', 'azul'],
  },
  {
    kind: 'music',
    terms: [
      'live music',
      ' dj ',
      'dj set',
      'band',
      'dance',
      'two-step',
      'concert',
      'stage',
      'lineup',
      'throwback',
    ],
  },
  {
    kind: 'drinks',
    terms: [
      'happy hour',
      'after hours',
      'nightcap',
      'cocktail',
      'margarita',
      'open bar',
      ' beer',
      'wine',
      'drinks',
    ],
  },
  {
    kind: 'food',
    terms: ['dinner', 'pizza', 'picnic', 'taco', 'food truck', 'small plates', 'brunch', 'lunch'],
  },
  {
    kind: 'networking',
    terms: [
      'meetup',
      'fireside',
      'engineering',
      'inference',
      'observability',
      'open source',
      'founder',
      'cto',
      'devtools',
    ],
  },
];

type EventCategoryInput = Pick<OffsiteEvent, 'title' | 'description' | 'venueName'>;

/**
 * Web-map presentation only. The shared event tags describe conference topics,
 * not activity types, and the mobile app has no activity taxonomy to mirror.
 * Keeping this inference outside src/offsite avoids changing the shared model
 * while still classifying attendee-submitted events that arrive at runtime.
 */
export function getMapEventCategory(event: EventCategoryInput): CategoryPresentation {
  const text = ` ${event.title} ${event.description} ${event.venueName} `.toLowerCase();
  const match = signals.find(({ terms }) => terms.some((term) => text.includes(term)));
  return presentations[match?.kind ?? 'social'];
}
