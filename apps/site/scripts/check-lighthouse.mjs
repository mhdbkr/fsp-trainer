#!/usr/bin/env node
// Lighthouse mobile, 4G simulée, médiane de 3 runs (contrat §7.1, AC2).
// Seuils : perf/a11y/best-practices/seo ≥ 95, TTI < 3000 ms, LCP ≤ 2500 ms, CLS ≤ 0.05.
// En preview (SITE_PUBLIC ≠ 'true') la page porte <meta robots noindex> : l'audit
// `is-crawlable` échoue systématiquement et fait chuter le score SEO — on le
// retire du calcul de la catégorie seo dans ce cas (recalcul pondéré sur les
// auditRefs restants), pour ne pas gater sur un artefact du preview.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listHtml } from './lib/dist.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../dist');
const outDir = resolve(here, '../reports/lighthouse');
const BASE = 'http://localhost:5182';
const PORT = 5182;

const ROUTES_WANTED = ['/de/', '/de/preise/', '/de/was-drankommt/', '/de/blog/', '/de/impressum/'];

const THRESHOLDS = { perf: 95, a11y: 95, bp: 95, seo: 95 };

export const med = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

// Route existante dans dist (index.html présent) : les autres sont ignorées
// avec un avertissement jusqu'à T2 (pages pas encore créées).
export function routesFromDist(distDir, wanted) {
  const present = new Set(
    listHtml(distDir).map((f) => f.slice(distDir.length).replace(/index\.html$/, '')),
  );
  // premier article de blog : dist/de/blog/<slug>/index.html
  const blogPost = [...present].find((r) => /^\/de\/blog\/[^/]+\/$/.test(r));
  const all = blogPost ? [...wanted, blogPost] : wanted;
  return { found: all.filter((r) => present.has(r)), missing: all.filter((r) => !present.has(r)) };
}

async function runLighthouse(url, port, publicSite) {
  const lighthouse = (await import('lighthouse')).default;
  const r = await lighthouse(url, {
    port,
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75 },
    throttlingMethod: 'simulate',
    throttling: { rttMs: 150, throughputKbps: 1600, cpuSlowdownMultiplier: 4 },
  });
  const lr = r.lhr;
  let seo = lr.categories.seo.score * 100;
  if (!publicSite) {
    const refs = lr.categories.seo.auditRefs.filter((ref) => ref.id !== 'is-crawlable' && ref.weight > 0);
    const total = refs.reduce((s, ref) => s + ref.weight, 0);
    if (total > 0) {
      const sum = refs.reduce((s, ref) => s + (lr.audits[ref.id]?.score ?? 0) * ref.weight, 0);
      seo = (sum / total) * 100;
    }
  }
  return {
    perf: lr.categories.performance.score * 100,
    a11y: lr.categories.accessibility.score * 100,
    bp: lr.categories['best-practices'].score * 100,
    seo,
    tti: lr.audits.interactive.numericValue,
    lcp: lr.audits['largest-contentful-paint'].numericValue,
    cls: lr.audits['cumulative-layout-shift'].numericValue,
  };
}

async function main() {
  if (!existsSync(dist)) {
    console.error('✗ check-lighthouse: dist/ absent, lancer `npm run build` avant');
    process.exitCode = 1;
    return;
  }
  const { found: routes, missing } = routesFromDist(dist, ROUTES_WANTED);
  for (const m of missing) console.warn(`⚠ check-lighthouse: ${m} absente de dist, ignorée (jusqu'à T2)`);
  if (routes.length === 0) {
    console.log('✓ check-lighthouse (0 route disponible)');
    return;
  }

  mkdirSync(outDir, { recursive: true });

  const chromeLauncher = await import('chrome-launcher');
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });

  const { spawn } = await import('node:child_process');
  const preview = spawn('npx', ['astro', 'preview', '--port', String(PORT)], {
    cwd: resolve(here, '..'),
    stdio: 'ignore',
  });
  async function waitUp() {
    for (let i = 0; i < 50; i++) {
      try {
        if ((await fetch(BASE + '/de/')).ok) return;
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error('preview injoignable');
  }

  const publicSite = process.env.SITE_PUBLIC === 'true';
  const errs = [];
  try {
    await waitUp();
    for (const route of routes) {
      const runs = [];
      for (let i = 0; i < 3; i++) {
        runs.push(await runLighthouse(BASE + route, chrome.port, publicSite));
      }
      const m = Object.fromEntries(
        Object.keys(runs[0]).map((k) => [k, med(runs.map((r) => r[k]))]),
      );
      writeFileSync(
        join(outDir, route.replace(/\//g, '_') + '.json'),
        JSON.stringify({ route, median: m, runs }, null, 2),
      );
      for (const [k, min] of Object.entries(THRESHOLDS)) {
        if (m[k] < min) errs.push(`${route}: ${k} ${m[k].toFixed(1)} < ${min}`);
      }
      if (m.tti >= 3000) errs.push(`${route}: TTI ${Math.round(m.tti)} ms ≥ 3000`);
      if (m.lcp > 2500) errs.push(`${route}: LCP ${Math.round(m.lcp)} ms > 2500`);
      if (m.cls > 0.05) errs.push(`${route}: CLS ${m.cls} > 0.05`);
      console.log(
        `${route}: perf ${m.perf.toFixed(1)} a11y ${m.a11y.toFixed(1)} bp ${m.bp.toFixed(1)} seo ${m.seo.toFixed(1)} tti ${Math.round(m.tti)}ms lcp ${Math.round(m.lcp)}ms cls ${m.cls.toFixed(3)}`,
      );
    }
  } finally {
    preview.kill();
    await chrome.kill();
  }

  if (errs.length) {
    for (const e of errs) console.error(`✗ ${e}`);
    console.error(`✗ check-lighthouse: ${errs.length} manquement(s)`);
    process.exitCode = 1;
  } else {
    console.log(`✓ check-lighthouse (${routes.length} route(s))`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
