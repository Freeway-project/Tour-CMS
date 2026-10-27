import { visionTool } from '@sanity/vision';
import { schemaTypes } from '@tour-cms/schema';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';

// Fallbacks keep `pnpm build` green in CI and on fresh clones that have no .env.
// A real project ID is required to actually open the Studio.
const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? 'placeholder';
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production';

/** Document types that only ever have one document. */
const singletonTypes = new Set(['siteSettings']);

export default defineConfig({
  name: 'default',
  title: 'Tour CMS',
  projectId,
  dataset,
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Site settings')
              .id('siteSettings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.divider(),
            S.documentTypeListItem('tour').title('Tours'),
            S.documentTypeListItem('landingPage').title('Landing pages'),
            S.documentTypeListItem('review').title('Reviews'),
            S.documentTypeListItem('pickupLocation').title('Pickup locations'),
            S.documentTypeListItem('guide').title('Guides'),
          ]),
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
    // Site settings is a singleton: keep it out of the "new document" menu.
    templates: (templates) => templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },
  document: {
    // Site settings must not be deleted or duplicated.
    actions: (previousActions, context) =>
      singletonTypes.has(context.schemaType)
        ? previousActions.filter(({ action }) => action !== 'delete' && action !== 'duplicate')
        : previousActions,
  },
});
