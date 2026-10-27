import { defineField, defineType } from 'sanity';

export const priceTier = defineType({
  name: 'priceTier',
  title: 'Price tier',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Who it applies to',
      type: 'string',
      description: 'For example "Adult", "Child 3–12" or "Senior 65+".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'priceCad',
      title: 'Price (CAD)',
      type: 'number',
      description: 'Price per person in Canadian dollars, before tax.',
      validation: (rule) => rule.required().min(0),
    }),
    defineField({
      name: 'note',
      title: 'Note',
      type: 'string',
      description: 'Optional detail, for example "Includes park fees".',
    }),
  ],
});
