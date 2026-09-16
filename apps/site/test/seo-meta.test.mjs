import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { listHtml } from '../scripts/lib/dist.mjs';

const distDir = fileURLToPath(new URL('../dist', import.meta.url));
const sitemapIndex = fileURLToPath(new URL('../dist/sitemap-index.xml', import.meta.url));
const built = existsSync(distDir);

// Pages légales (LegalPage.astro, hors périmètre T3.1) : le contenu Markdown de
// docs/legal commence à h2 — aucun h1 de page. Concern remonté au lead-site plutôt
// que corrigé ici (périmètre = Base.astro uniquement, pas les layouts de contenu).
const H1_EXEMPT = ['/de/agb/', '/de/datenschutz/', '/de/impressum/', '/de/widerruf/'];

function pages() {
  return listHtml(distDir).filter((p) => p.includes(`${distDir}/de/`.replace(/\/+/g, '/')) || p.replace(distDir, '').startsWith('/de/'));
}

test('métadonnées de chaque page dist/de/**', { skip: !built && 'npm run build requis avant ce test' }, () => {
  const errs = [];
  for (const file of pages()) {
    const html = readFileSync(file, 'utf8');
    const rel = file.replace(distDir, '');

    const titles = [...html.matchAll(/<title>([\s\S]*?)<\/title>/g)];
    if (titles.length !== 1) errs.push(`${rel}: ${titles.length} <title> (attendu 1)`);
    else if (titles[0][1].length > 60) errs.push(`${rel}: title > 60 (${titles[0][1].length})`);

    const descs = [...html.matchAll(/<meta name="description" content="([^"]*)"/g)];
    if (descs.length !== 1) errs.push(`${rel}: ${descs.length} meta description (attendu 1)`);
    else if (descs[0][1].length > 155) errs.push(`${rel}: description > 155 (${descs[0][1].length})`);

    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/);
    if (!canonical) errs.push(`${rel}: canonical absent`);
    else if (!canonical[1].endsWith('/')) errs.push(`${rel}: canonical ne finit pas par / (${canonical[1]})`);

    if (!/hreflang="de"/.test(html)) errs.push(`${rel}: hreflang="de" absent`);
    if (!/property="og:image"/.test(html)) errs.push(`${rel}: og:image absent`);

    const ldJson = [...html.matchAll(/<script type="application\/ld\+json">/g)];
    if (ldJson.length < 2) errs.push(`${rel}: ${ldJson.length} bloc(s) ld+json (attendu >= 2)`);

    const h1s = [...html.matchAll(/<h1[\s>]/g)];
    const path = rel.replace(/index\.html$/, '');
    if (!H1_EXEMPT.includes(path) && h1s.length !== 1) errs.push(`${rel}: ${h1s.length} <h1> (attendu 1)`);

    if (!/<html lang="de">/.test(html)) errs.push(`${rel}: lang="de" absent sur <html>`);
  }
  assert.equal(errs.length, 0, errs.join('\n'));
});

test('sitemap-index.xml présent et référence sitemap-0.xml avec les 15 routes, sans /404/', { skip: !built && 'npm run build requis avant ce test' }, () => {
  assert.ok(existsSync(sitemapIndex), 'dist/sitemap-index.xml absent');
  const index = readFileSync(sitemapIndex, 'utf8');
  assert.match(index, /sitemap-0\.xml/);

  const sitemap0 = fileURLToPath(new URL('../dist/sitemap-0.xml', import.meta.url));
  assert.ok(existsSync(sitemap0), 'dist/sitemap-0.xml absent');
  const xml = readFileSync(sitemap0, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  // 15 routes selon le plan (T3.1) ; la 16e est un 2e article de blog ajouté après
  // le plan (revue T2.8/T2.9) — compte réel = nombre de pages /de/** hors 404.
  const realRoutes = pages().length;
  assert.equal(locs.length, realRoutes, `attendu ${realRoutes} routes (= pages dist/de/**), trouvé ${locs.length}: ${locs.join(', ')}`);
  assert.ok(!locs.some((l) => l.includes('/404/')), '/404/ présent dans le sitemap');
});
