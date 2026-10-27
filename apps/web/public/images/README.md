# Images

Real tour photos go in this folder, with the file names referenced by
`apps/web/src/data/fixtures.ts` and, later, by the Sanity image CDN.

Until the real photos are ready, fixtures point at `placeholder-*.jpg` paths.
Those files are intentionally **not** committed: pages that use them will show
a broken image, which makes it obvious that a photo still needs to be added.

When adding a photo:

- Export AVIF and WebP at the sizes the page needs; keep the original JPEG too.
- Use descriptive file names (`niagara-falls-hornblower-cruise.jpg`).
- Keep files under ~200 KB where possible and always record the real width and
  height in the fixture (or let `astro:assets` read them from the file).
