import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const entries = await getCollection('blog', ({ data }) => !data.draft);
  entries.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  return rss({
    title: 'FSP Trainer — von Doctopus',
    description: 'Beiträge von Doctopus zur Fachsprachprüfung.',
    site: context.site!,
    items: entries.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: e.data.pubDate,
      link: `/de/blog/${e.id}/`,
    })),
    customData: '<language>de</language>',
  });
}
