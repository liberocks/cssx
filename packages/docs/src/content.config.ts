import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.enum(['Start here', 'Utility syntax', 'Utilities', 'Advanced']),
    order: z.number(),
    keywords: z.array(z.string()).default([]),
  }),
});

export const collections = { docs };
