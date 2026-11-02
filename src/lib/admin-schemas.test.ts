import { describe, expect, it } from 'vitest';

import { itineraryText, itineraryToText, siteSettingsSchema, tourSchema } from './admin-schemas';

const base = {
  name: 'Toronto Niagara Tours',
  tagline: 'Niagara Falls day tours',
  phone: '+1 416 555 0142',
  whatsapp: '+1 416 555 0142',
  email: 'hello@torontoniagara.ca',
  address: '65 Front St W, Toronto',
  hst_number: '',
  cancellation_policy: 'Free cancellation up to 24 hours before departure.',
  announcement_text: '',
  announcement_href: '',
};

describe('siteSettingsSchema policy fields', () => {
  it('accepts written policies and trims them', () => {
    const parsed = siteSettingsSchema.parse({
      ...base,
      privacy_policy: '  ## What we collect\n\nYour name and email.  ',
      terms: 'You agree to these terms.',
    });
    expect(parsed.privacy_policy).toBe('## What we collect\n\nYour name and email.');
    expect(parsed.terms).toBe('You agree to these terms.');
  });

  it('treats empty or missing policies as not written', () => {
    const parsed = siteSettingsSchema.parse({ ...base, privacy_policy: '', terms: null });
    expect(parsed.privacy_policy).toBeUndefined();
    expect(parsed.terms).toBeUndefined();
  });

  it('rejects a policy over 20,000 characters', () => {
    const result = siteSettingsSchema.safeParse({ ...base, terms: 'x'.repeat(20001) });
    expect(result.success).toBe(false);
  });
});

describe('itineraryText', () => {
  it('parses one stop per line and normalises the time', () => {
    expect(
      itineraryText.parse('8:00 | Pickup at York St\n\n10.30 | Floral Clock | Photo stop | 15 min\n'),
    ).toEqual([
      { time: '08:00', title: 'Pickup at York St', detail: null },
      { time: '10:30', title: 'Floral Clock', detail: 'Photo stop | 15 min' },
    ]);
  });

  it('reports the line that is not "time | title"', () => {
    const result = itineraryText.safeParse('08:00 | Pickup\nlunch somewhere');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('Line 2');
    expect(itineraryText.safeParse('25:00 | Late').success).toBe(false);
  });

  it('round-trips through the admin text', () => {
    const stops = itineraryText.parse('08:00 | Pickup | Bring a jacket\n18:30 | Back in Toronto');
    expect(itineraryText.parse(itineraryToText(stops))).toEqual(stops);
  });
});

describe('tourSchema new fields', () => {
  const tour = {
    title: 'Niagara Falls Day Tour',
    short_description: 'A day at the falls',
    description: 'Long description',
    duration_hours: '10',
    duration_minutes_extra: '0',
    sort_order: '0',
    status: 'active',
  };

  it('accepts an optional group limit and a not-included list', () => {
    const parsed = tourSchema.parse({ ...tour, max_guests: '11', excludes: 'Lunch\nBoat cruise tickets' });
    expect(parsed.max_guests).toBe(11);
    expect(parsed.excludes).toEqual(['Lunch', 'Boat cruise tickets']);
    expect(tourSchema.parse({ ...tour, max_guests: '' }).max_guests).toBeUndefined();
    expect(tourSchema.safeParse({ ...tour, max_guests: '0' }).success).toBe(false);
  });
});
