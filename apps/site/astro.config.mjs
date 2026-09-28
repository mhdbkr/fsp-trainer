import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// SITE_URL est la seule variable d'URL au build ; en preview elle vaut un domaine
// non résolvable et check-placeholders --public refuse ".invalid" (spec D6).
const site = process.env.SITE_URL ?? 'https://doctopus.invalid';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  i18n: { defaultLocale: 'de', locales: ['de'], routing: { prefixDefaultLocale: true } },
  redirects: { '/': '/de/' },           // preview local ; en prod vercel.json 308 prime (T3.2)
  integrations: [tailwind({ applyBaseStyles: false }), mdx(), sitemap({ filter: (p) => !p.endsWith('/404/') })],
  build: { inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
});
