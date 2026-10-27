import { defineArrayMember, defineField, defineType } from 'sanity';

export const landingPage = defineType({
  name: 'landingPage',
  title: 'Landing page',
  type: 'document',
  description:
    'A focused page for a paid ad. Each page has one clear call to action and usually stays out of Google.',
  fields: [
    defineField({
      name: 'title',
      title: 'Internal name',
      type: 'string',
      description: 'Only your team sees this. Use the campaign name so the page is easy to find.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      description: 'The page lives at /lp/<slug>. Generated from the internal name.',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tour',
      title: 'Tour',
      type: 'reference',
      description: 'The tour this page sells.',
      to: [{ type: 'tour' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'variant',
      title: 'A/B variant',
      type: 'string',
      description: 'Use A and B to test two versions of the same ad page.',
      options: {
        list: [
          { title: 'A', value: 'A' },
          { title: 'B', value: 'B' },
        ],
        layout: 'radio',
      },
      initialValue: 'A',
    }),
    defineField({
      name: 'utmCampaign',
      title: 'Ad campaign',
      type: 'string',
      description: 'Match this to the Google Ads campaign name so you can see which ads convert.',
    }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      description: 'The big promise at the top of the page.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subheadline',
      title: 'Subheadline',
      type: 'text',
      rows: 2,
      description: 'A sentence under the headline that adds detail or urgency.',
    }),
    defineField({
      name: 'sections',
      title: 'Page sections',
      type: 'array',
      description: 'Build the page by adding and reordering sections.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'heroSection',
          title: 'Hero',
          fields: [
            defineField({
              name: 'image',
              title: 'Image',
              type: 'imageWithAlt',
              description: 'The main photo behind or beside the headline.',
            }),
            defineField({
              name: 'showRating',
              title: 'Show the star rating',
              type: 'boolean',
              description: 'Display the average customer rating under the headline.',
              initialValue: false,
            }),
            defineField({
              name: 'cta',
              title: 'Button',
              type: 'ctaButton',
            }),
          ],
          preview: {
            select: {
              button: 'cta.label',
              media: 'image',
            },
            prepare: ({ button, media }) => ({
              title: 'Hero',
              subtitle: button ? `Button: ${button}` : 'Hero section',
              media,
            }),
          },
        }),
        defineArrayMember({
          type: 'object',
          name: 'benefitsSection',
          title: 'Benefits',
          fields: [
            defineField({
              name: 'heading',
              title: 'Heading',
              type: 'string',
              description: 'For example "Why book with us".',
            }),
            defineField({
              name: 'items',
              title: 'Benefits',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'benefit',
                  title: 'Benefit',
                  fields: [
                    defineField({
                      name: 'icon',
                      title: 'Icon',
                      type: 'string',
                      options: {
                        list: [
                          { title: 'Clock', value: 'clock' },
                          { title: 'Bus', value: 'bus' },
                          { title: 'People', value: 'users' },
                          { title: 'Ticket', value: 'ticket' },
                          { title: 'Shield', value: 'shield' },
                          { title: 'Star', value: 'star' },
                        ],
                        layout: 'radio',
                      },
                    }),
                    defineField({
                      name: 'title',
                      title: 'Title',
                      type: 'string',
                      description: 'A few words, for example "Skip the ticket line".',
                    }),
                    defineField({
                      name: 'text',
                      title: 'Text',
                      type: 'string',
                      description: 'One short sentence explaining the benefit.',
                    }),
                  ],
                  preview: {
                    select: {
                      title: 'title',
                      subtitle: 'text',
                    },
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: {
              heading: 'heading',
            },
            prepare: ({ heading }) => ({
              title: heading || 'Benefits',
              subtitle: 'Benefits section',
            }),
          },
        }),
        defineArrayMember({
          type: 'object',
          name: 'itinerarySection',
          title: 'Itinerary',
          fields: [
            defineField({
              name: 'heading',
              title: 'Heading',
              type: 'string',
              description: 'For example "Your day, step by step".',
            }),
          ],
          preview: {
            select: {
              heading: 'heading',
            },
            prepare: ({ heading }) => ({
              title: heading || 'Itinerary',
              subtitle: "Uses the tour's itinerary",
            }),
          },
        }),
        defineArrayMember({
          type: 'object',
          name: 'reviewsSection',
          title: 'Reviews',
          fields: [
            defineField({
              name: 'heading',
              title: 'Heading',
              type: 'string',
              description: 'For example "What guests say".',
            }),
            defineField({
              name: 'reviews',
              title: 'Reviews',
              type: 'array',
              description: 'Pick up to 6 reviews to show.',
              of: [defineArrayMember({ type: 'reference', to: [{ type: 'review' }] })],
              validation: (rule) => rule.max(6),
            }),
          ],
          preview: {
            select: {
              heading: 'heading',
            },
            prepare: ({ heading }) => ({
              title: heading || 'Reviews',
              subtitle: 'Reviews section',
            }),
          },
        }),
        defineArrayMember({
          type: 'object',
          name: 'faqSection',
          title: 'FAQ',
          fields: [
            defineField({
              name: 'heading',
              title: 'Heading',
              type: 'string',
              description: 'For example "Questions before you book".',
            }),
            defineField({
              name: 'items',
              title: 'Questions',
              type: 'array',
              of: [defineArrayMember({ type: 'faqItem' })],
            }),
          ],
          preview: {
            select: {
              heading: 'heading',
            },
            prepare: ({ heading }) => ({
              title: heading || 'FAQ',
              subtitle: 'FAQ section',
            }),
          },
        }),
        defineArrayMember({
          type: 'object',
          name: 'ctaSection',
          title: 'Call to action',
          fields: [
            defineField({
              name: 'heading',
              title: 'Heading',
              type: 'string',
              description: 'For example "Ready to see the Falls?".',
            }),
            defineField({
              name: 'text',
              title: 'Text',
              type: 'string',
              description: 'A short line under the heading.',
            }),
            defineField({
              name: 'cta',
              title: 'Button',
              type: 'ctaButton',
            }),
          ],
          preview: {
            select: {
              heading: 'heading',
              button: 'cta.label',
            },
            prepare: ({ heading, button }) => ({
              title: heading || 'Call to action',
              subtitle: button ? `Button: ${button}` : 'Call to action section',
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      description: 'Landing pages are hidden from search engines by default.',
      initialValue: { noIndex: true },
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'headline',
      media: 'sections.0.image',
    },
  },
});
