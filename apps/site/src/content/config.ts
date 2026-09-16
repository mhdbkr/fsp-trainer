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

export const collections = { legal };
