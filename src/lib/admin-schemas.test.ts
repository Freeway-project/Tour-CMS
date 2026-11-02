import { describe, expect, it } from 'vitest';

import { siteSettingsSchema } from './admin-schemas';

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
