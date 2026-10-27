import { defineArrayMember, defineField, defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  description:
    'Contact details and defaults used across the whole website. There is only one of these.',
  fields: [
    defineField({
      name: 'siteName',
      title: 'Site name',
      type: 'string',
      description: 'The business name shown in the browser tab and search results.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description:
        'A short line about the business, for example "Niagara Falls tours from Toronto".',
    }),
    defineField({
      name: 'phone',
      title: 'Phone number',
      type: 'string',
      description: 'The number customers should call, including area code.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'whatsapp',
      title: 'WhatsApp number',
      type: 'string',
      description: 'Optional number for WhatsApp messages, including country code.',
    }),
    defineField({
      name: 'email',
      title: 'Email address',
      type: 'string',
      description: 'Where customer enquiries are sent.',
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'text',
      rows: 3,
      description: 'The office address shown in the footer.',
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      description: 'The business logo used in the header and footer.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'defaultSeo',
      title: 'Default SEO',
      type: 'seo',
      description: 'Used on pages that do not have their own SEO settings.',
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      description: 'Links to the business profiles shown in the footer.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'socialLink',
          title: 'Social link',
          fields: [
            defineField({
              name: 'platform',
              title: 'Platform',
              type: 'string',
              options: {
                list: [
                  { title: 'Facebook', value: 'facebook' },
                  { title: 'Instagram', value: 'instagram' },
                  { title: 'TikTok', value: 'tiktok' },
                  { title: 'YouTube', value: 'youtube' },
                  { title: 'Tripadvisor', value: 'tripadvisor' },
                  { title: 'Google', value: 'google' },
                ],
              },
            }),
            defineField({
              name: 'url',
              title: 'Profile URL',
              type: 'url',
            }),
          ],
          preview: {
            select: {
              title: 'platform',
              subtitle: 'url',
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'announcementBar',
      title: 'Announcement bar',
      type: 'object',
      description: 'A thin message at the very top of the site, for example a seasonal offer.',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: 'enabled',
          title: 'Show the announcement bar',
          type: 'boolean',
          initialValue: false,
        }),
        defineField({
          name: 'text',
          title: 'Text',
          type: 'string',
          description: 'Keep it short, for example "Spring sale: 15% off May departures".',
        }),
        defineField({
          name: 'link',
          title: 'Link',
          type: 'url',
          description: 'Optional page the announcement bar should link to.',
        }),
      ],
    }),
    defineField({
      name: 'trustBadges',
      title: 'Trust badges',
      type: 'array',
      description: 'Logos and awards shown near the booking button, for example Tripadvisor.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'trustBadge',
          title: 'Trust badge',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'The text shown with the badge, for example "Travellers’ Choice 2026".',
            }),
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: { hotspot: true },
            }),
          ],
          preview: {
            select: {
              title: 'label',
              media: 'image',
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'siteName',
      subtitle: 'tagline',
      media: 'logo',
    },
  },
});
