import { describe, expect, it } from 'vitest';

import { heroImage, parseStoredPhoto, storageImageUrl } from './photos';

const SUPABASE = 'https://abc.supabase.co/';

describe('storageImageUrl', () => {
  it('builds the public bucket URL and encodes each segment', () => {
    expect(storageImageUrl(SUPABASE, '/tours/day tour/falls 1.jpg')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/tour-images/tours/day%20tour/falls%201.jpg',
    );
  });
});

describe('parseStoredPhoto', () => {
  it('returns a sized photo', () => {
    expect(
      parseStoredPhoto({ path: 'site/guide.jpg', width: 800, height: 1000, alt: 'Your guide' }, SUPABASE),
    ).toEqual({
      src: 'https://abc.supabase.co/storage/v1/object/public/tour-images/site/guide.jpg',
      alt: 'Your guide',
      width: 800,
      height: 1000,
    });
  });

  it('treats missing, unsized or unconfigured photos as none', () => {
    expect(parseStoredPhoto(null, SUPABASE)).toBeNull();
    expect(parseStoredPhoto({ path: 'site/x.jpg' }, SUPABASE)).toBeNull();
    expect(parseStoredPhoto({ path: '', width: 1, height: 1 }, SUPABASE)).toBeNull();
    expect(parseStoredPhoto({ path: 'site/x.jpg', width: 10, height: 10 }, undefined)).toBeNull();
  });
});

describe('heroImage', () => {
  it('picks the hero or nothing', () => {
    expect(heroImage([{ isHero: false }, { isHero: true, id: 'b' }])).toEqual({ isHero: true, id: 'b' });
    expect(heroImage([{ isHero: false }])).toBeNull();
  });
});
