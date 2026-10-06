#!/usr/bin/env node
// ============================================================================
// Garde-fou S4-5 (revue direction) : sur un téléphone de 390 px (et 375 px), la carte de couverture FERMÉE tient dans
// un écran, et la page Programme ne déborde pas à droite (Q-6). Mesuré dans le DOM de l'app, sur les 130 cas réels.
//
// Sans Supabase : le serveur `vite` reçoit une URL factice (aucun réseau), le contenu est écrit dans l'IndexedDB de la
// session, puis l'app démarre sur ce cache (`contentLoader` : hors ligne + cache ⇒ no-op).
//   PLAYWRIGHT_CORE=<dossier de playwright-core> [CHROMIUM_PATH=<chromium>] node scripts/e2e/carteCouverture390.mjs [--port 5292]
// Sortie : 0 si tout tient, 1 sinon.
// ============================================================================
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { loadChromium } from '../parcours-lib.mjs';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const argv = process.argv.slice(2);
const PORT = argv.includes('--port') ? Number(argv[argv.indexOf('--port') + 1]) : 5292;
const BASE = `http://localhost:${PORT}`;

const serveur = spawn(`${APP}node_modules/.bin/vite`, ['--port', String(PORT), '--strictPort'], {
  cwd: APP, stdio: 'ignore', detached: true,
  env: { ...process.env, VITE_SUPABASE_URL: 'http://127.0.0.1:9', VITE_SUPABASE_ANON_KEY: 'factice' },
});
const fautes = [];
let navigateur;
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* pas encore */ } await sleep(500); }
  // CHROMIUM_PATH : un chromium déjà présent quand celui attendu par playwright-core n'est pas installé.
  navigateur = await (await loadChromium(APP)).launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const largeur of [390, 375]) {
    const page = await navigateur.newPage({ viewport: { width: largeur, height: 844 } });
    await page.goto(`${BASE}/#/`);
    await page.evaluate(async () => {
      const { db } = await import('/src/db/db.ts');
      const { seedCases } = await import('/src/data/seedCases.ts');
      await db.cases.bulkPut(seedCases());
      await db.meta.put({ key: 'contentVersion', value: 1 });
      await db.meta.put({ key: 'program', value: { startDate: '2026-09-01', examDate: '2027-06-01', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } });
    });
    await page.goto(`${BASE}/#/programme`);
    await page.reload();
    await page.waitForFunction(() => [...document.querySelectorAll('main section h2')].some((h) => h.textContent === 'Carte de couverture'), null, { timeout: 60_000 });
    await sleep(500);
    const m = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      const carte = [...document.querySelectorAll('main section')].find((s) => s.querySelector('h2')?.textContent === 'Carte de couverture');
      const main = document.querySelector('main');
      return {
        vh, hauteur: Math.round(carte.getBoundingClientRect().height),
        horsEcran: [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5); }).length,
        debord: main.scrollWidth - Math.round(main.getBoundingClientRect().width),
        cadransOuverts: carte.querySelectorAll('button[aria-haspopup="dialog"]').length,
      };
    });
    console.log(`${largeur} px : carte fermée ${m.hauteur} px (écran ${m.vh}), ${m.horsEcran} élément(s) hors écran, débord ${m.debord} px`);
    if (m.cadransOuverts) fautes.push(`${largeur} px : la carte n'est pas fermée`);
    if (m.hauteur > m.vh) fautes.push(`${largeur} px : la carte fermée (${m.hauteur} px) dépasse l'écran (${m.vh} px)`);
    if (m.horsEcran || m.debord > 0) fautes.push(`${largeur} px : la page déborde (${m.horsEcran} élément(s), ${m.debord} px)`);
    await page.close();
  }
} catch (e) {
  fautes.push(String(e?.message ?? e));
} finally {
  await navigateur?.close();
  try { process.kill(-serveur.pid, 'SIGKILL'); } catch { /* déjà arrêté */ }
}
for (const f of fautes) console.log(`KO ${f}`);
process.exit(fautes.length ? 1 : 0);
