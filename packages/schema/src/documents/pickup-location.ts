import { defineField, defineType } from 'sanity';

export const pickupLocation = defineType({
  name: 'pickupLocation',
  title: 'Pickup location',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description:
        'How guests will recognise the spot, for example "Union Station – Front St entrance".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'string',
      description: 'The full street address, including city and postal code.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'geo',
      title: 'Map location',
      type: 'geopoint',
      description: 'Optional map pin so guests can open the spot in their maps app.',
    }),
    defineField({
      name: 'pickupTime',
      title: 'Pickup time',
      type: 'string',
      description: 'When the bus arrives here, for example "8:15 AM".',
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 3,
      description: 'Optional directions, for example "Wait by the taxi stand on Front Street".',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'address',
    },
  },
});
