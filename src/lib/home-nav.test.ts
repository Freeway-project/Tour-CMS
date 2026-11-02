import { describe, expect, it } from 'vitest';

import { tours } from '../data/fixtures';
import { homeNav, homeSections, pickupPoints } from './home-nav';

describe('homeNav', () => {
  it('lists only the sections that render, in page order', () => {
    expect(homeNav({ tours: true, experience: false, pickup: true, reviews: false, faq: true })).toEqual([
      { href: '/#tours', label: 'Tours' },
      { href: '/#pickup', label: 'Pickup' },
      { href: '/#faq', label: 'FAQ' },
    ]);
    expect(homeNav({ tours: false, experience: false, pickup: false, reviews: false, faq: false })).toEqual([]);
  });
});

describe('pickupPoints', () => {
  const tour = tours[0]!;
  const pickup = tour.pickups[0]!;

  it('dedupes across tours and skips inactive, placeholder and hidden-tour pickups', () => {
    const points = pickupPoints([
      { ...tour, pickups: [pickup, { ...pickup, id: 'off', isActive: false }] },
      { ...tour, id: 'b', pickups: [pickup, { ...pickup, id: 'todo', name: 'TODO: pickup' }] },
      { ...tour, id: 'c', status: 'hidden', pickups: [{ ...pickup, id: 'hidden-tour' }] },
    ]);
    expect(points.map((point) => point.id)).toEqual([pickup.id]);
  });
});

describe('homeSections', () => {
  it('hides sections without real data', () => {
    const tour = { ...tours[0]!, images: [] };
    const review = { id: 'r', author: 'TODO: name', location: null, rating: 5, text: 'TODO: text', reviewDate: '2026-01-01', source: 'google' as const, tourId: null, featured: true, isActive: true, sortOrder: 0 };
    expect(homeSections([tour], [review], [])).toMatchObject({ tours: true, experience: false, reviews: false, faq: false });
    expect(homeSections([], [], []).tours).toBe(false);
  });
});
