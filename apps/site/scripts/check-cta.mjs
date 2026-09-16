#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listHtml, report } from './lib/dist.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../dist');
const BASE = 'http://localhost:5181';
const VIEWPORTS = [[360, 640], [768, 1024], [1280, 800]];

export const safeHost = (u) => { try { return new URL(u).host; } catch { return null; } };

// Routes servies sous /de/, hors 404.
export function routesFromDist(distDir) {
  return listHtml(distDir).map((f) => f.slice(distDir.length).replace(/index\.html$/, '')).filter((r) => r.startsWith('/de/') && !r.includes('404'));
}

// AC10 (G2) : seule requête tierce tolérée = l'hôte de l'endpoint analytics configuré ;
// '{{ANALYTICS_ENDPOINT}}' (placeholder non résolu) → host = null → aucun tiers toléré.
export function thirdPartyViolations(requestUrls, allowedHost) {
  return [...new Set(requestUrls)].filter((u) => safeHost(u) !== allowedHost);
}

async function main() {
  const { chromium } = await import('playwright');
  const { spawn } = await import('node:child_process');
  const site = JSON.parse(readFileSync(resolve(here, '../src/data/site.json'), 'utf8'));
  const allowedHost = safeHost(process.env.ANALYTICS_ENDPOINT ?? site.analyticsEndpoint);
  const routes = routesFromDist(dist);
  const preview = spawn('npx', ['astro', 'preview', '--port', '5181'], { cwd: resolve(here, '..'), stdio: 'ignore' });
  async function waitUp() { for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/de/')).ok) return; } catch {} await new Promise((r) => setTimeout(r, 200)); } throw new Error('preview injoignable'); }

  const errs = [];
  try {
    await waitUp();
    const browser = await chromium.launch();
    for (const [w, h] of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const third = [];
      page.on('request', (r) => { if (!r.url().startsWith(BASE)) third.push(r.url()); });
      for (const route of routes) {
        await page.goto(BASE + route, { waitUntil: 'networkidle' });
        if (!(await page.$('meta[name="robots"][content="noindex"]')) && process.env.SITE_PUBLIC !== 'true') errs.push(`${route} ${w}px: meta robots noindex absent (SITE_PUBLIC≠true)`);
        const total = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < total; y += Math.floor(h * 0.8)) {
          await page.evaluate((y) => window.scrollTo(0, y), y);
          await page.waitForTimeout(50);
          const ok = await page.evaluate(() => [...document.querySelectorAll('[data-cta]')].some((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight; }));
          if (!ok) { errs.push(`${route} ${w}px: aucun [data-cta] visible au scroll ${y}`); break; }
        }
      }
      if ((await ctx.cookies()).length) errs.push(`${w}px: cookies posés : ${JSON.stringify(await ctx.cookies())}`);
      const bad = thirdPartyViolations(third, allowedHost);
      if (bad.length) errs.push(`${w}px: requêtes tierces non autorisées : ${bad.join(', ')}`);
      await ctx.close();
    }
    // AC9 — reduced motion sur /de/
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(BASE + '/de/', { waitUntil: 'networkidle' });
    await page.mouse.move(100, 100); await page.waitForTimeout(300);
    const anims = await page.evaluate(() => document.getAnimations().length);
    if (anims !== 0) errs.push(`/de/ reduced-motion : ${anims} animation(s) actives`);
    await browser.close();
  } finally { preview.kill(); }
  report(errs, `check-cta (${routes.length} routes × ${VIEWPORTS.length} viewports)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
