#!/usr/bin/env node
// ============================================================================
// Garde-fou : à 390 px, aucune page de cas (`/#/cas/<id>`, fiche clinique) ne défile à droite — sur les 130 cas.
// Défaut corrigé : la grille de la page n'avait pas de colonne sur mobile (piste implicite `auto`), la piste prenait
// la largeur min-content de son contenu, dont les lignes tronquées (`truncate`, nowrap) des Fachbegriffe du cas ;
// `main.scrollWidth` montait à 440–483 px pour 326 px visibles. Et chaque ligne tronquée tient dans son bouton
// (`max-w-full` : dans un flex colonne `items-start`, un span nowrap prend sa largeur max-content et ne tronque pas).
// La liste `/#/cas` aussi : aucun débord de `main`, aucune carte dont un descendant dépasse. Défaut corrigé : même
// piste `auto` sous `sm`, et un titre allemand sans césure (« Wortfindungsstörungen ») poussait le cadran hors de la
// carte. Mesuré dans le DOM de l'app.
//
// Sans Supabase : `vite` reçoit une URL factice (aucun réseau), cas et Fachbegriffe sont écrits dans l'IndexedDB de
// la session, liés comme le fait la publication (`caseTermLinks.json`), puis l'app démarre sur ce cache.
//   PLAYWRIGHT_CORE=<dossier de playwright-core> [CHROMIUM_PATH=<chromium>] node scripts/e2e/casDetail390.mjs [--port 5294]
// Sortie : 0 si tout tient, 1 sinon.
// ============================================================================
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { loadChromium } from '../parcours-lib.mjs';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const argv = process.argv.slice(2);
const PORT = argv.includes('--port') ? Number(argv[argv.indexOf('--port') + 1]) : 5294;
const BASE = `http://localhost:${PORT}`;

const serveur = spawn(`${APP}node_modules/.bin/vite`, ['--port', String(PORT), '--strictPort'], {
  cwd: APP, stdio: 'ignore', detached: true,
  env: { ...process.env, VITE_SUPABASE_URL: 'http://127.0.0.1:9', VITE_SUPABASE_ANON_KEY: 'factice' },
});
const fautes = [];
let navigateur;
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* pas encore */ } await sleep(500); }
  navigateur = await (await loadChromium(APP)).launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/#/`);
  const ids = await page.evaluate(async () => {
    const { db } = await import('/src/db/db.ts');
    const { seedCases } = await import('/src/data/seedCases.ts');
    const { seedFachbegriffe } = await import('/src/data/seedFachbegriffe.ts');
    const liens = await (await fetch('/src/data/caseTermLinks.json')).json();
    const cases = seedCases().map((c) => ({ ...c, linkedFachbegriffeIds: [...new Set([...(c.linkedFachbegriffeIds ?? []), ...(liens[c.id] ?? [])])] }));
    await db.cases.bulkPut(cases);
    await db.fachbegriffe.bulkPut(seedFachbegriffe());
    await db.meta.put({ key: 'contentVersion', value: 1 });
    return cases.map((c) => [c.id, c.name]);
  });
  await page.reload();
  let mesures = 0;
  for (const [id, nom] of ids) {
    await page.goto(`${BASE}/#/cas/${id}`);
    // Page du BON cas rendue, et liste des termes peuplée (c'est elle qui portait le débord).
    await page.waitForFunction((nom) => document.querySelector('main h1')?.textContent?.includes(nom)
      && document.querySelector('main ul li button span.truncate'), nom, { timeout: 30_000 })
      .catch(() => fautes.push(`${id} : page ou termes non rendus`));
    const m = await page.evaluate(() => {
      const main = document.querySelector('main');
      // Une ligne de terme tronquée doit tenir dans son bouton (sinon elle passe sous le badge et l'étoile).
      const lignes = [...main.querySelectorAll('ul li button span.truncate')]
        .filter((s) => s.getBoundingClientRect().right > s.parentElement.getBoundingClientRect().right + 0.5).length;
      return { sw: main.scrollWidth, cw: main.clientWidth, lignes };
    });
    mesures++;
    if (m.sw > m.cw) fautes.push(`${id} : main.scrollWidth ${m.sw} > clientWidth ${m.cw}`);
    if (m.lignes) fautes.push(`${id} : ${m.lignes} ligne(s) de terme débordent de leur bouton (troncature inopérante)`);
  }
  console.log(`390 px : ${mesures} pages de cas mesurées, ${fautes.length} faute(s)`);

  // Liste des cas : toutes les cartes rendues (une par cas), cadrans fermés.
  await page.goto(`${BASE}/#/cas`);
  await page.waitForFunction((n) => document.querySelectorAll('main .card .case-dial').length >= n, ids.length, { timeout: 30_000 })
    .catch(() => fautes.push(`/cas : moins de ${ids.length} cartes rendues`));
  await sleep(500);
  const liste = await page.evaluate(() => {
    const main = document.querySelector('main');
    const cartes = [...main.querySelectorAll('.card')].filter((carte) => carte.querySelector('.case-dial'));
    const hors = cartes.filter((carte) => {
      const c = carte.getBoundingClientRect();
      return [...carte.querySelectorAll('*')].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > c.right + 0.5 || r.left < c.left - 0.5); });
    }).map((carte) => carte.querySelector('h3')?.textContent);
    return { sw: main.scrollWidth, cw: main.clientWidth, cartes: cartes.length, hors };
  });
  console.log(`390 px : /cas, ${liste.cartes} cartes, main ${liste.sw}/${liste.cw}, ${liste.hors.length} carte(s) débordée(s)`);
  if (liste.sw > liste.cw) fautes.push(`/cas : main.scrollWidth ${liste.sw} > clientWidth ${liste.cw}`);
  if (liste.hors.length) fautes.push(`/cas : ${liste.hors.length} carte(s) dont un descendant dépasse (${liste.hors.slice(0, 5).join(' · ')})`);
} catch (e) {
  fautes.push(String(e?.message ?? e));
} finally {
  await navigateur?.close();
  try { process.kill(-serveur.pid, 'SIGKILL'); } catch { /* déjà arrêté */ }
}
for (const f of fautes) console.log(`KO ${f}`);
process.exit(fautes.length ? 1 : 0);
