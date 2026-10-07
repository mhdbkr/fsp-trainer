#!/usr/bin/env node
// ============================================================================
// Garde-fou : à 390 px, aucun titre de Fachwissen ne dépasse son cadre — `h1` des 134 fiches (`/#/fachwissen/<id>`)
// et `h3` des cartes de la liste `/#/fachwissen` — et `main` ne défile jamais à droite.
// Défaut corrigé : titres allemands sans césure dans une interface `lang="fr"` (« Alkoholentzugssyndrom »,
// « Thrombozytenaggregationshemmung ») — un mot plus large que la colonne sortait du cadre. Même règle que la
// liste `/#/cas` (#95) : `lang="de"`, `hyphens-auto`, `break-words`, `min-w-0`. Mesuré dans le DOM de l'app.
//
// Sans Supabase : `vite` reçoit une URL factice (aucun réseau), les fiches sont écrites dans l'IndexedDB de la
// session, puis l'app redémarre sur ce cache (même amorce que casDetail390.mjs).
//   PLAYWRIGHT_CORE=<dossier de playwright-core> [CHROMIUM_PATH=<chromium>] node scripts/e2e/fachwissen390.mjs [--port 5295]
// Sortie : 0 si tout tient, 1 sinon.
// ============================================================================
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { loadChromium } from '../parcours-lib.mjs';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const argv = process.argv.slice(2);
const PORT = argv.includes('--port') ? Number(argv[argv.indexOf('--port') + 1]) : 5295;
const BASE = `http://localhost:${PORT}`;

const serveur = spawn(`${APP}node_modules/.bin/vite`, ['--port', String(PORT), '--strictPort'], {
  cwd: APP, stdio: 'ignore', detached: true,
  env: { ...process.env, VITE_AUTH_MODE: 'public', VITE_SUPABASE_URL: 'http://127.0.0.1:9', VITE_SUPABASE_ANON_KEY: 'factice' },
});
// Un titre dépasse si son contenu est plus large que sa boîte, ou si sa boîte sort de celle de `main`.
const deborde = (sel) => [...document.querySelectorAll(sel)].filter((t) => {
  const main = document.querySelector('main').getBoundingClientRect();
  const r = t.getBoundingClientRect();
  return t.scrollWidth > t.clientWidth || r.right > main.right + 0.5;
}).map((t) => `${t.textContent} (+${t.scrollWidth - t.clientWidth} px)`);
const fautes = [];
let navigateur;
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* pas encore */ } await sleep(500); }
  navigateur = await (await loadChromium(APP)).launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(20_000);
  await page.goto(`${BASE}/#/`);
  const fiches = await page.evaluate(async () => {
    const { db } = await import('/src/db/db.ts');
    const { seedFachwissen } = await import('/src/data/seedFachwissen.ts');
    const fw = seedFachwissen();
    await db.fachwissen.bulkPut(fw);
    await db.meta.put({ key: 'contentVersion', value: 1 });
    return fw.map((f) => [f.id, f.pathology]);
  });
  await page.reload();
  const titres = [];
  for (const [id, nom] of fiches) {
    await page.goto(`${BASE}/#/fachwissen/${id}`);
    const ok = await page.waitForFunction((nom) => document.querySelector('main h1')?.textContent === nom, nom)
      .then(() => true, () => false);
    if (!ok) { fautes.push(`${id} : fiche non rendue`); continue; }
    const m = await page.evaluate(`(${() => {
      const main = document.querySelector('main');
      return { sw: main.scrollWidth, cw: main.clientWidth };
    }})()`);
    const hors = await page.evaluate(`(${deborde})('main h1')`);
    if (m.sw > m.cw) fautes.push(`${id} : main.scrollWidth ${m.sw} > clientWidth ${m.cw}`);
    titres.push(...hors);
  }
  console.log(`390 px : ${fiches.length} fiches mesurées, ${titres.length} titre(s) h1 en débord`);
  for (const t of titres) fautes.push(`h1 ${t}`);

  await page.goto(`${BASE}/#/fachwissen`);
  await page.waitForFunction((n) => document.querySelectorAll('main a[href^="#/fachwissen/"] h3').length >= n, fiches.length)
    .catch(() => fautes.push(`/fachwissen : moins de ${fiches.length} cartes rendues`));
  const liste = await page.evaluate(`({
    sw: document.querySelector('main').scrollWidth, cw: document.querySelector('main').clientWidth,
    hors: (${deborde})('main a[href^="#/fachwissen/"] h3'),
  })`);
  console.log(`390 px : /fachwissen, main ${liste.sw}/${liste.cw}, ${liste.hors.length} titre(s) de carte en débord`);
  if (liste.sw > liste.cw) fautes.push(`/fachwissen : main.scrollWidth ${liste.sw} > clientWidth ${liste.cw}`);
  for (const t of liste.hors) fautes.push(`carte ${t}`);
} catch (e) {
  fautes.push(String(e?.message ?? e));
} finally {
  await navigateur?.close();
  try { process.kill(-serveur.pid, 'SIGKILL'); } catch { /* déjà arrêté */ }
}
for (const f of fautes) console.log(`KO ${f}`);
process.exit(fautes.length ? 1 : 0);
