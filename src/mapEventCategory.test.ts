import { describe, expect, it } from 'vitest';
import { getMapEventCategory } from './mapEventCategory';

function event(title: string, description = '', venueName = '') {
  return { title, description, venueName };
}

describe('getMapEventCategory', () => {
  it.each([
    {
      title: 'FinTech After Hours',
      description: 'Payments and frozen margaritas.',
      venueName: 'Half Step',
      expected: 'drinks',
    },
    {
      title: 'Design Systems Dinner',
      description: 'A small dinner.',
      venueName: 'Comedor',
      expected: 'food',
    },
    {
      title: 'Barton Springs Sunset Swim',
      description: 'Bring a towel.',
      venueName: 'Barton Springs Pool',
      expected: 'fitness',
    },
    {
      title: 'Board games + beer',
      description: 'Bringing Wingspan and Azul.',
      venueName: 'Emerald Tavern',
      expected: 'games',
    },
    {
      title: 'Rooftop DJ Set',
      description: 'House until 1.',
      venueName: 'Upstairs at Caroline',
      expected: 'music',
    },
    {
      title: 'AI Infra Meetup',
      description: 'Three lightning talks.',
      venueName: 'Capital Factory',
      expected: 'networking',
    },
    {
      title: 'Rainey Rooftop Social',
      description: 'An easy first stop.',
      venueName: 'The Bungalow',
      expected: 'social',
    },
  ])('$title → $expected', ({ title, description, venueName, expected }) => {
    expect(getMapEventCategory(event(title, description, venueName)).kind).toBe(expected);
  });

  it('falls back to social for an unknown attendee-submitted activity', () => {
    expect(getMapEventCategory(event('Come hang out')).kind).toBe('social');
  });
});
