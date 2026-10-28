import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * With `output: 'server'`, every route renders on the worker unless it opts
 * into static generation with `export const prerender = true`. The marketing
 * pages (where paid traffic lands) must stay static, so a missing export is a
 * bug — this test fails before a new page can silently become server-rendered.
 */

const pagesDir = fileURLToPath(new URL('../src/pages/', import.meta.url));

// Either value is an explicit choice; only a missing export is wrong.
const PRERENDER_EXPORT = /export\s+const\s+prerender\s*=\s*(?:true|false)\b/;

function pageFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...pageFiles(path));
      continue;
    }

    // Astro does not route `_`-prefixed files, and tests are not pages.
    if (entry.name.startsWith('_') || entry.name.includes('.test.')) continue;
    if (entry.name.includes('.spec.')) continue;

    if (entry.name.endsWith('.astro') || entry.name.endsWith('.ts')) files.push(path);
  }

  return files;
}

const pages = pageFiles(pagesDir).sort();

describe('page prerender exports', () => {
  it('finds the pages to check', () => {
    // Without this, a broken scan would pass by checking nothing.
    expect(pages.length).toBeGreaterThan(0);
  });

  it('every page declares prerender explicitly', () => {
    const missing = pages
      .filter((file) => !PRERENDER_EXPORT.test(readFileSync(file, 'utf8')))
      .map((file) => relative(pagesDir, file));

    expect(missing).toEqual([]);
  });
});
