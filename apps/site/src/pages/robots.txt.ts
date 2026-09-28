import type { APIRoute } from 'astro';
import { readSite } from '@/lib/site';

export const GET: APIRoute = ({ site }) => {
  const config = readSite();
  const body = config.public
    ? `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`
    : `User-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
