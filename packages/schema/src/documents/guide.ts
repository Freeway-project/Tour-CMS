import { defineArrayMember, defineField, defineType } from 'sanity';

export const guide = defineType({
  name: 'guide',
  title: 'Guide',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'The guide’s name as guests will see it.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'imageWithAlt',
      description: 'A friendly headshot of the guide.',
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      rows: 4,
      description: 'A short introduction, up to 400 characters.',
      validation: (rule) => rule.max(400),
    }),
    defineField({
      name: 'languages',
      title: 'Languages',
      type: 'array',
      description: 'Languages the guide can tour in, for example "English" or "French".',
      of: [defineArrayMember({ type: 'string' })],
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'bio',
      media: 'photo',
    },
  },
});
