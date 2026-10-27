import { visionTool } from '@sanity/vision';
import { schemaTypes } from '@tour-cms/schema';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';

// Fallbacks keep `pnpm build` green in CI and on fresh clones that have no .env.
// A real project ID is required to actually open the Studio.
const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? 'placeholder';
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production';

export default defineConfig({
  name: 'default',
  title: 'Tour CMS',
  projectId,
  dataset,
  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
});
