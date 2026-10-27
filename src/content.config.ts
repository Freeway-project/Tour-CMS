import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

/**
 * Marketing copy lives in JSON files so the owner can edit it without touching
 * a component. The Supabase tables hold the catalogue (tours, prices, dates);
 * these collections hold the text around it.
 */

const faqs = defineCollection({
  loader: file('src/content/faqs.json'),
  schema: z.object({
    id: z.string(),
    question: z.string(),
    /** Markdown. Rendered by the page that shows the FAQ. */
    answer: z.string(),
    tags: z.array(z.string()).default([]),
  }),
});

const reviews = defineCollection({
  loader: file('src/content/reviews.json'),
  schema: z.object({
    id: z.string(),
    author: z.string(),
    location: z.string().optional(),
    rating: z.number().int().min(1).max(5),
    text: z.string(),
    /** ISO date, `YYYY-MM-DD`. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source: z.enum(['google', 'tripadvisor', 'viator', 'direct']),
    featured: z.boolean().default(false),
  }),
});

/**
 * `site.json` holds a single settings object. The file loader expects either an
 * array of entries or an object keyed by entry id, so the parser wraps the
 * plain object as one entry with the id `site`.
 */
const site = defineCollection({
  loader: file('src/content/site.json', {
    parser: (text) => ({ site: JSON.parse(text) as Record<string, unknown> }),
  }),
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    phone: z.string(),
    whatsapp: z.string(),
    email: z.string().email(),
    address: z.string(),
    hstNumber: z.string().optional(),
    cancellationPolicy: z.string(),
    announcement: z.object({
      enabled: z.boolean(),
      text: z.string(),
      href: z.string().optional(),
    }),
    ratings: z.array(
      z.object({
        platform: z.string(),
        score: z.number(),
        count: z.number().int().nonnegative(),
        url: z.string(),
      }),
    ),
  }),
});

export const collections = { faqs, reviews, site };
