import { describe, expect, it } from 'vitest';

import { MAX_UPLOAD_BYTES, checkPhotoUpload, safeFileName } from './upload';

const photo = (type: string, size = 1000) => new File([new Uint8Array(size)], 'a.webp', { type });

describe('checkPhotoUpload', () => {
  it('accepts a sized image', () => {
    expect(checkPhotoUpload(photo('image/webp'), 1600, 1067)).toEqual({ ok: true });
  });

  it('rejects missing files, other types, oversize files and bad dimensions', () => {
    expect(checkPhotoUpload(null, 10, 10).ok).toBe(false);
    expect(checkPhotoUpload(photo('image/webp', 0), 10, 10).ok).toBe(false);
    expect(checkPhotoUpload(photo('image/svg+xml'), 10, 10).ok).toBe(false);
    expect(checkPhotoUpload(photo('text/html'), 10, 10).ok).toBe(false);
    expect(checkPhotoUpload(photo('image/jpeg', MAX_UPLOAD_BYTES + 1), 10, 10).ok).toBe(false);
    expect(checkPhotoUpload(photo('image/jpeg'), 0, 10).ok).toBe(false);
    expect(checkPhotoUpload(photo('image/jpeg'), 1.5, 10).ok).toBe(false);
  });
});

describe('safeFileName', () => {
  it('keeps only safe characters', () => {
    expect(safeFileName('My Photo (1).webp')).toBe('My_Photo_1_.webp');
    expect(safeFileName('../../etc/passwd')).toBe('.._.._etc_passwd');
  });
});
