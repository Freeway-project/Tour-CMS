import { describe, expect, it } from 'vitest';

import { heroImage, parseStoredPhoto, slideshowPhotos, storageImageUrl } from './photos';

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

describe('slideshowPhotos', () => {
  const img = (src: string, sortOrder: number, isHero = false, alt = '') => ({ src, alt, sortOrder, isHero });

  it('puts every hero first, then the other images by sort order', () => {
    const dayTour = [img('b.jpg', 2), img('a.jpg', 1, true), img('c.jpg', 0)];
    const privateTour = [img('d.jpg', 0, true), img('e.jpg', 1)];
    expect(slideshowPhotos([dayTour, privateTour]).map((image) => image.src)).toEqual([
      'a.jpg',
      'd.jpg',
      'c.jpg',
      'b.jpg',
      'e.jpg',
    ]);
  });

  it('drops duplicates by src and respects the cap', () => {
    const one = [img('a.jpg', 0, true), img('b.jpg', 1)];
    const two = [img('b.jpg', 0, true), img('a.jpg', 1), img('c.jpg', 2)];
    expect(slideshowPhotos([one, two]).map((image) => image.src)).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
    expect(slideshowPhotos([one, two], 2)).toHaveLength(2);
  });

  it('treats the same alt text as the same photo, but not empty alt text', () => {
    const one = [img('one/queen.jpg', 0, true, 'Queen Street'), img('one/x.jpg', 1)];
    const two = [img('two/queen.jpg', 0, false, ' queen street '), img('two/y.jpg', 1)];
    expect(slideshowPhotos([one, two]).map((image) => image.src)).toEqual([
      'one/queen.jpg',
      'one/x.jpg',
      'two/y.jpg',
    ]);
  });

  it('works for a single tour without a hero and for no photos', () => {
    expect(slideshowPhotos([[img('x.jpg', 1), img('w.jpg', 0)]]).map((image) => image.src)).toEqual([
      'w.jpg',
      'x.jpg',
    ]);
    expect(slideshowPhotos([[], []])).toEqual([]);
  });
});
