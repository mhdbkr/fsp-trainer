import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const legal = defineCollection({
  loader: glob({ base: '../../docs/legal', pattern: ['impressum.md', 'datenschutz.md', 'agb.md', 'widerruf.md'] }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    validated_by: z.string().default(''),
    validated_at: z.string().default(''),
    placeholders: z.array(z.string()).default([]),
  }),
});

const faq = defineCollection({
  loader: glob({ base: './src/content/faq', pattern: '*.md' }),
  schema: z.object({
    question: z.string(),
    category: z.enum(['pruefung', 'produkt', 'preise', 'konto']),
    order: z.number(),
  }),
});

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '*.mdx' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    center: z.enum(['Fr', 'Ka', 'Re', 'St']).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { legal, faq, blog };
