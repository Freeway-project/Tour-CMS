import { defineField, defineType } from 'sanity';

export const itineraryStop = defineType({
  name: 'itineraryStop',
  title: 'Itinerary stop',
  type: 'object',
  fields: [
    defineField({
      name: 'time',
      title: 'Time',
      type: 'string',
      description: 'Roughly when this happens, for example "8:00 AM".',
    }),
    defineField({
      name: 'title',
      title: 'Stop name',
      type: 'string',
      description: 'For example "Hornblower boat cruise".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'A sentence or two about what guests do here.',
    }),
    defineField({
      name: 'durationMinutes',
      title: 'Duration (minutes)',
      type: 'number',
      description: 'How long guests spend at this stop, in minutes.',
      validation: (rule) => rule.min(0),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'time',
    },
  },
});
