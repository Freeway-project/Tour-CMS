/** Largest photo the admin accepts. The browser resizes to WebP first, so real uploads are far smaller. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set(['image/webp', 'image/jpeg', 'image/png', 'image/avif']);

export interface UploadCheck {
  ok: boolean;
  message?: string;
}

/** Server-side check for an admin photo upload, whatever the browser claimed to do. */
export function checkPhotoUpload(file: unknown, width: number, height: number): UploadCheck {
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: 'Choose a photo to upload.' };
  if (!ALLOWED_TYPES.has(file.type)) return { ok: false, message: 'Upload a JPEG, PNG, WebP or AVIF photo.' };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: 'That photo is over 5 MB.' };
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width > 6000 || height > 6000) {
    return { ok: false, message: 'Could not read the photo size.' };
  }
  return { ok: true };
}

/** Storage-safe file name, keeping the extension. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return cleaned.slice(-80) || 'photo.webp';
}
