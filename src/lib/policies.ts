import { isPlaceholder } from './placeholder';
import type { SiteSettings } from './types';

/** The public policy pages, all written by the owner in /admin/settings. */
export const POLICY_PAGES = [
  { key: 'cancellationPolicy', path: '/cancellation-policy/', title: 'Cancellation policy' },
  { key: 'privacyPolicy', path: '/privacy/', title: 'Privacy policy' },
  { key: 'terms', path: '/terms/', title: 'Terms and conditions' },
] as const satisfies ReadonlyArray<{ key: keyof SiteSettings; path: string; title: string }>;

export type PolicyKey = (typeof POLICY_PAGES)[number]['key'];

/** True once the owner has written the policy (not empty, not `TODO: …`). */
export function hasPolicy(site: SiteSettings, key: PolicyKey): boolean {
  return !isPlaceholder(site[key]);
}

/** Links for the footer: only policies that are written. */
export function policyLinks(site: SiteSettings): Array<{ href: string; label: string }> {
  return POLICY_PAGES.filter((page) => hasPolicy(site, page.key)).map((page) => ({
    href: page.path,
    label: page.title,
  }));
}

/** robots.txt: keep crawlers out of admin, API and private booking pages. */
export function robotsTxt(site: URL): string {
  return [
    'User-agent: *',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /booking/',
    '',
    `Sitemap: ${new URL('/sitemap-index.xml', site).href}`,
    '',
  ].join('\n');
}
