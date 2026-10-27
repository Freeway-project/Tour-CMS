import { defineField, defineType } from 'sanity';

export const review = defineType({
  name: 'review',
  title: 'Review',
  type: 'document',
  fields: [
    defineField({
      name: 'authorName',
      title: 'Reviewer name',
      type: 'string',
      description: 'The name shown with the review, for example "Sarah M.".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'authorLocation',
      title: 'Reviewer location',
      type: 'string',
      description: 'Optional, for example "Chicago, USA".',
    }),
    defineField({
      name: 'rating',
      title: 'Rating',
      type: 'number',
      description: 'How many stars the guest gave, from 1 to 5.',
      validation: (rule) => rule.required().integer().min(1).max(5),
    }),
    defineField({
      name: 'text',
      title: 'Review text',
      type: 'text',
      rows: 5,
      description: 'What the guest wrote, copied exactly.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Review date',
      type: 'date',
      description: 'The day the review was posted.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'Where the review came from.',
      options: {
        list: [
          { title: 'Google', value: 'google' },
          { title: 'Tripadvisor', value: 'tripadvisor' },
          { title: 'Facebook', value: 'facebook' },
          { title: 'Direct', value: 'direct' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sourceUrl',
      title: 'Source URL',
      type: 'url',
      description: 'Optional link to the original review.',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      description: 'Featured reviews can appear on the home page and landing pages.',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'authorName',
      subtitle: 'text',
    },
  },
});
