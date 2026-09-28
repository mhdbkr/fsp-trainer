import type { SiteConfig } from './site';

// JSON-LD Organization/WebSite (schema.org) — injectés sur chaque page par Base.astro,
// avant les jsonLd propres à la page (FAQPage, etc.).

// `siteUrl` = Astro.site.href (source unique des URLs absolues, cf. astro.config.mjs) ;
// ne pas reconstruire depuis site.domain, qui reste un placeholder en preview.

export function jsonLdOrganization(site: SiteConfig, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.brandName,
    url: siteUrl,
    email: site.supportEmail,
  };
}

export function jsonLdWebSite(site: SiteConfig, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.brandName,
    url: siteUrl,
    inLanguage: 'de',
  };
}
