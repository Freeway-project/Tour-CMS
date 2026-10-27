import { defineField, defineType } from 'sanity';

export const ctaButton = defineType({
  name: 'ctaButton',
  title: 'Button',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Button text',
      type: 'string',
      description: 'For example "Book now" or "Call us".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Button action',
      type: 'string',
      description: 'What happens when a customer taps the button.',
      options: {
        list: [
          { title: 'Start a booking', value: 'book' },
          { title: 'Open a link', value: 'link' },
          { title: 'Call the phone number', value: 'phone' },
          { title: 'Message on WhatsApp', value: 'whatsapp' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Link URL',
      type: 'url',
      description: 'Required when the button action is "Open a link".',
      hidden: ({ parent }) => parent?.kind !== 'link',
      validation: (rule) =>
        rule.custom<string>((url, context) => {
          const parent = context.parent as { kind?: string } | undefined;
          if (parent?.kind === 'link' && !url) {
            return 'Add the URL this button should link to.';
          }
          return true;
        }),
    }),
  ],
  preview: {
    select: {
      title: 'label',
      subtitle: 'kind',
    },
  },
});
