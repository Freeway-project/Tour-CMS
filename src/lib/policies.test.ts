import { describe, expect, it } from 'vitest';

import { siteSettings } from '../data/fixtures';
import { hasPolicy, policyLinks, robotsTxt } from './policies';

describe('policy pages', () => {
  it('hides every policy while the fixtures hold placeholders', () => {
    expect(policyLinks(siteSettings)).toEqual([]);
    expect(hasPolicy(siteSettings, 'cancellationPolicy')).toBe(false);
  });

  it('links only the policies the owner has written, in a fixed order', () => {
    const site = {
      ...siteSettings,
      terms: 'You agree to these terms.',
      cancellationPolicy: 'Free cancellation up to 24 hours before departure.',
      privacyPolicy: '',
    };
    expect(policyLinks(site)).toEqual([
      { href: '/cancellation-policy/', label: 'Cancellation policy' },
      { href: '/terms/', label: 'Terms and conditions' },
    ]);
  });
});

describe('robotsTxt', () => {
  it('blocks private routes and points to the sitemap', () => {
    const body = robotsTxt(new URL('https://torontoniagara.ca'));
    expect(body).toContain('User-agent: *');
    for (const path of ['/admin/', '/api/', '/booking/']) {
      expect(body).toContain(`Disallow: ${path}`);
    }
    expect(body).toContain('Sitemap: https://torontoniagara.ca/sitemap-index.xml');
    expect(body).not.toMatch(/Disallow: \/\s*$/m);
  });
});
