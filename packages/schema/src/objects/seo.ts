import { defineField, defineType } from 'sanity';

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  description: 'Controls how this page appears in Google and on social media.',
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      description: 'Shown in Google search results and browser tabs. Keep it under 60 characters.',
      validation: (rule) =>
        rule.max(60).warning('Longer titles get cut off in Google search results.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      description: 'Shown in Google search results. Keep it under 155 characters.',
      validation: (rule) =>
        rule.max(155).warning('Longer descriptions get cut off in Google search results.'),
    }),
    defineField({
      name: 'ogImage',
      title: 'Social share image',
      type: 'image',
      description:
        'Shown when the page is shared on social media. Use a landscape photo at least 1200 × 630 px.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'noIndex',
      title: 'Hide from search engines',
      type: 'boolean',
      description: 'Turn this on to keep the page out of Google and other search engines.',
      initialValue: false,
    }),
  ],
});
