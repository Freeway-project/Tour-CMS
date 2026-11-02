import { describe, expect, it } from 'vitest';

import { tours } from '../data/fixtures';
import { boatCruiseStatus, tourFacts, tourInclusions } from './tour-facts';

const shared = tours.find((tour) => !tour.isPrivate)!;
const priv = tours.find((tour) => tour.isPrivate)!;

describe('tourFacts', () => {
  it('shows the all-in price, group limit, duration and pickup for a shared tour', () => {
    const facts = tourFacts({ ...shared, maxGuests: 11 });
    expect(facts.priceUnit).toBe('per adult, including HST');
    expect(facts.price).toMatch(/^\$\d/);
    expect(facts.guests).toBe('Max 11 guests');
    expect(facts.duration).toBe('10 hours');
  });

  it('describes private tours per vehicle', () => {
    const facts = tourFacts(priv);
    expect(facts.priceUnit).toBe('per vehicle, including HST');
    expect(facts.guests).toMatch(/^Up to \d+ guests per vehicle$/);
  });

  it('leaves unknown facts out', () => {
    const facts = tourFacts({ ...shared, maxGuests: null, packages: [], pickups: [] });
    expect(facts).toMatchObject({ price: null, priceUnit: null, guests: null, pickup: null });
  });
});

describe('tourInclusions', () => {
  it('dedupes across packages and drops placeholders', () => {
    const items = tourInclusions({
      ...shared,
      packages: shared.packages.map((pkg, index) => ({
        ...pkg,
        includes: index === 0 ? ['Floral Clock', 'TODO: lunch', 'Floral Clock'] : ['Floral Clock', 'Wine tasting'],
      })),
    });
    expect(items[0]).toBe('Floral Clock');
    expect(items).not.toContain('TODO: lunch');
    expect(new Set(items).size).toBe(items.length);
  });
});

describe('boatCruiseStatus', () => {
  const withData = (includes: string[], excludes: string[]) => ({
    ...shared,
    packages: shared.packages.map((pkg) => ({ ...pkg, isActive: true, includes })),
    excludes,
  });

  it('is included only when an active package lists it', () => {
    expect(boatCruiseStatus(withData(['Floral Clock', 'Niagara City Cruises boat ride'], []))).toBe('included');
  });

  it('is not included only when the exclusions name it', () => {
    expect(boatCruiseStatus(withData(['Floral Clock'], ['Boat cruise tickets']))).toBe('not-included');
  });

  it('is unknown otherwise, and placeholders do not count', () => {
    expect(boatCruiseStatus(withData(['Floral Clock'], []))).toBeNull();
    expect(boatCruiseStatus(withData(['TODO: boat cruise'], ['TODO: cruise']))).toBeNull();
  });
});
