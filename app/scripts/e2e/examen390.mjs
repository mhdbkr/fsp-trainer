#!/usr/bin/env node
// ============================================================================
// Sonde S4-7 : l'Examen joué dans le navigateur, à l'horloge ACCÉLÉRÉE (`page.clock` de Playwright), mesuré dans le DOM.
//   1. /examen à 390 et 1280 px : rien ne déborde, cibles ≥ 44 px, aucun nom / id / spécialité de cas, aucun id dans l'URL ;
//   2. deux onglets : le simulant ouvre la seconde fenêtre (sa fiche suit le cas) ; le médecin ne voit jamais le cas ;
//   3. examen complet accéléré : Anamnese, [Aufklärung], transition, Dokumentation, Fallvorstellung, auto-évaluation,
//      enregistrement, résultat (le cas révélé, conditions remplies) ;
//   4. rechargement en cours de Teil : l'horloge murale reprend où elle en est ;
//   5. onglet en arrière-plan : minuteries gelées 25 min, puis visible — le Teil est fini, le suivant commence ;
//   6. abandon pendant l'Anamnese (rien) puis après (« Examen interrompu » à l'Historique).
// Sans Supabase : `vite` reçoit une URL factice. Le corpus est semé comme le contenu publié (comme historique390.mjs) ;
// aucune MESURE ne lit un module importé.
//   PLAYWRIGHT_CORE=<dossier de playwright-core> node scripts/e2e/examen390.mjs [--port 5294] [--captures]
// `--captures` : docs/reports/s4-7-examen-{390,1280}.png et s4-7-teil-{390,1280}.png. Sortie : 0 si tout tient, 1 sinon.
// ============================================================================
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { loadChromium } from '../parcours-lib.mjs';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const argv = process.argv.slice(2);
const PORT = argv.includes('--port') ? Number(argv[argv.indexOf('--port') + 1]) : 5294;
const BASE = `http://localhost:${PORT}`;
const CAPTURES = argv.includes('--captures');
const T0 = new Date('2026-10-06T09:00:00');

const serveur = spawn(`${APP}node_modules/.bin/vite`, ['--port', String(PORT), '--strictPort'], {
  cwd: APP, stdio: 'ignore', detached: true,
  env: { ...process.env, VITE_SUPABASE_URL: 'http://127.0.0.1:9', VITE_SUPABASE_ANON_KEY: 'factice' },
});

const fautes = [];
const ko = (m) => { fautes.push(m); console.log(`   ✗ ${m}`); };
const ok = (m) => console.log(`   ✓ ${m}`);

/** Le contenu, semé comme une publication. Rend les secrets (nom, id, spécialité) de tous les cas, pour les chercher. */
async function semer(page) {
  return page.evaluate(async () => {
    const { db } = await import('/src/db/db.ts');
    const { seedCases } = await import('/src/data/seedCases.ts');
    const cases = seedCases();
    await db.cases.bulkPut(cases);
    await db.meta.put({ key: 'contentVersion', value: 1 });
    return cases.map((c) => ({ id: c.id, name: c.name, specialty: c.specialty, patient: c.patientSheet?.personalia?.name ?? '' }));
  });
}

async function ouvrir(navigateur, largeur) {
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: largeur > 1000 ? 900 : 844 } });
  const page = await contexte.newPage();
  page.on('dialog', (d) => d.accept());
  await page.clock.install({ time: T0 });
  await page.goto(`${BASE}/#/`);
  const secrets = await semer(page);
  await page.goto(`${BASE}/#/examen`);
  await page.reload();
  await page.getByRole('button', { name: 'Démarrer l’examen' }).waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => !document.querySelector('button.btn-primary:disabled'), null, { timeout: 30_000 });
  return { contexte, page, secrets };
}

/** Ce que le DOM et l'URL du médecin laissent voir du cas. */
const fuite = (page, cas) => page.evaluate((cas) => {
  const html = document.body.innerHTML;
  return [cas.name, cas.id, cas.specialty].filter((s) => s && (html.includes(s) || location.hash.includes(s)));
}, cas);

const mesure = (page) => page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const main = document.querySelector('main');
  return {
    debord: main ? main.scrollWidth - Math.round(main.getBoundingClientRect().width) : 0,
    horsEcran: [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5); }).length,
    // Les cibles de la page de l'Examen (la barre du Shell n'est pas de ce lot).
    petites: [...document.querySelectorAll('[data-examen-page] button:not(:disabled), [data-examen-page] a, [data-examen] button:not(:disabled), [data-examen] a')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height < 44; }).map((b) => b.textContent.trim()),
    phase: document.querySelector('[data-examen]')?.getAttribute('data-examen-phase') ?? null,
    reste: Number(document.querySelector('[data-examen-reste]')?.getAttribute('data-examen-reste') ?? NaN),
  };
});
const phase = (page, p) => page.waitForFunction((p) => document.querySelector('[data-examen]')?.getAttribute('data-examen-phase') === p, p, { timeout: 20_000 });
const avance = async (page, ms) => { await page.clock.runFor(ms); };
let navigateur;
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* pas encore */ } await sleep(500); }
  navigateur = await (await loadChromium(APP)).launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

  // ---- 1 et 2 : la page, deux onglets, l'examen complet (390 px) ; la page et un Teil à 1280 px ----
  for (const largeur of [390, 1280]) {
    console.log(`${largeur} px`);
    const { contexte, page, secrets } = await ouvrir(navigateur, largeur);
    let m = await mesure(page);
    if (m.debord > 0 || m.horsEcran) ko(`${largeur} px, /examen déborde (${m.debord} px, ${m.horsEcran} élément(s))`); else ok('/examen tient dans la largeur');
    if (m.petites.length) ko(`${largeur} px, /examen : cibles < 44 px : ${m.petites.join(' | ')}`);
    const fuitesAvant = await page.evaluate((secrets) => {
      const html = document.body.innerHTML;
      return secrets.filter((s) => html.includes(s.name) || html.includes(s.id) || location.hash.includes(s.id)).map((s) => s.name);
    }, secrets);
    if (fuitesAvant.length) ko(`avant : le DOM nomme ${fuitesAvant.slice(0, 3).join(', ')}`); else ok(`avant : aucun des ${secrets.length} cas dans le DOM ni dans l’URL`);
    if (CAPTURES) await page.screenshot({ path: `${APP}docs/reports/s4-7-examen-${largeur}.png`, fullPage: true });

    // Le simulant : la seconde fenêtre s'ouvre par un bouton, sa fiche porte le cas.
    await page.getByRole('button', { name: /Avec un simulant/ }).click();
    const [patient] = await Promise.all([contexte.waitForEvent('page'), page.getByRole('button', { name: /Ouvrir en 2ᵉ fenêtre/ }).click()]);
    await patient.waitForLoadState();
    const caseId = decodeURIComponent(patient.url().match(/#\/patient\/([^?]+)/)?.[1] ?? '');
    const cas = secrets.find((s) => s.id === caseId);
    if (!cas) { ko(`la seconde fenêtre n’ouvre pas une fiche de cas (${patient.url()})`); await contexte.close(); continue; }
    await patient.waitForFunction((n) => document.body.textContent.includes(n), cas.patient, { timeout: 30_000 }).then(
      () => ok('seconde fenêtre : la fiche du simulant montre le patient du cas tiré'),
      () => ko('seconde fenêtre : la fiche du patient ne s’affiche pas'));

    await page.getByRole('button', { name: 'Démarrer l’examen' }).click();
    await phase(page, 'anamnese');
    m = await mesure(page);
    if (m.reste !== 1200 && m.reste !== 900) ko(`début : reste ${m.reste} s`);
    if ((await fuite(page, cas)).length) ko(`pendant : le DOM ou l’URL nomment le cas (${(await fuite(page, cas)).join(', ')})`); else ok(`pendant : ni nom, ni id, ni spécialité (${page.url().split('#')[1]})`);
    if (m.debord > 0 || m.horsEcran) ko(`${largeur} px, Teil en cours : débordement`); else ok('Teil en cours tient dans la largeur');
    if (m.petites.length) ko(`${largeur} px, Teil en cours : cibles < 44 px : ${m.petites.join(' | ')}`);
    if (CAPTURES) await page.screenshot({ path: `${APP}docs/reports/s4-7-teil-${largeur}.png`, fullPage: false });
    if (largeur === 1280) { await contexte.close(); continue; }

    // 3 — examen complet, accéléré.
    const avecAufk = m.reste === 900;
    if (avecAufk) {
      await avance(page, 15 * 60_000); await phase(page, 'aufklaerung');
      const t = await page.textContent('[data-examen]');
      if (!/Klären Sie den Patienten/.test(t) || /Ouvrir la trame|Risiken/.test(t)) ko('Aufklärung : demande du jury absente, ou une aide est montrée'); else ok('Aufklärung du cas, à la fin du créneau, sans aide');
      await avance(page, 5 * 60_000);
    } else await avance(page, 20 * 60_000);
    await phase(page, 'transition'); ok('transition après l’Anamnese');
    await avance(page, 61_000); await phase(page, 'dokumentation');
    await page.fill('textarea[data-arztbrief]', 'Sehr geehrte Frau Kollegin,');
    await avance(page, 20 * 60_000); await phase(page, 'transition');
    await avance(page, 61_000); await phase(page, 'fallvorstellung');
    await avance(page, 20 * 60_000); await phase(page, 'bewertung'); ok('Fallvorstellung finie seule : auto-évaluation');
    const enregistrer = page.getByRole('button', { name: 'Enregistrer l’examen' });
    if (!(await enregistrer.isDisabled())) ko('« Enregistrer » permis sans grilles');
    const noter = async () => { for (const k of ['aussprache', 'wortschatz', 'grammatik', 'redefluss', 'kommunikation']) { const r = page.locator(`#langue-${k}`); if (await r.count()) await r.fill('4'); } };
    await noter();
    await page.getByRole('navigation', { name: 'Auto-évaluation' }).getByRole('button', { name: /Fallvorstellung/ }).click();
    await noter();
    if (await enregistrer.isDisabled()) ko('« Enregistrer » refusé avec les grilles A et F saisies (critères de langue : vérifier les clés)');
    await enregistrer.click();
    await page.waitForSelector('[data-examen-conditions]', { timeout: 20_000 });
    const res = await page.evaluate(() => ({ cond: document.querySelector('[data-examen-conditions]').getAttribute('data-examen-conditions'), hash: location.hash, texte: document.body.textContent }));
    if (res.cond !== '') ko(`résultat : conditions manquantes « ${res.cond} »`); else ok('résultat : conditions d’examen remplies');
    if (!res.texte.includes(cas.name)) ko('résultat : le cas n’est pas révélé'); else ok(`résultat : le cas est révélé (${res.hash})`);
    await contexte.close();
  }

  // ---- 4 : rechargement en cours de Teil ----
  console.log('rechargement');
  {
    const { contexte, page } = await ouvrir(navigateur, 390);
    await page.getByRole('button', { name: 'Démarrer l’examen' }).click();
    await phase(page, 'anamnese');
    const avant = (await mesure(page)).reste;
    await avance(page, 4 * 60_000);
    await page.reload();
    await phase(page, 'anamnese');
    await avance(page, 1_000);
    const apres = (await mesure(page)).reste;
    // L'horloge court aussi pendant le rechargement réel (quelques secondes) : le reste est au plus avant − 240 s, jamais remis à neuf.
    if (!(apres <= avant - 240 && apres >= avant - 240 - 30)) ko(`après rechargement : reste ${apres} s pour ${avant - 240} au plus`); else ok(`après rechargement : ${apres} s pour ${avant} avant 4 min (l’horloge murale a continué)`);
    // ---- 5 : onglet en arrière-plan — minuteries gelées 25 min, puis visible ----
    console.log('arrière-plan');
    await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 1_000));
    await page.clock.setSystemTime(new Date((await page.evaluate(() => Date.now())) + 25 * 60_000));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.clock.resume();
    await phase(page, 'dokumentation').then(() => ok('retour au premier plan : Anamnese finie, Dokumentation commencée'), () => ko('retour au premier plan : le Teil échu n’est pas fini'));
    await contexte.close();
  }

  // ---- 6 : abandon avant, puis après un Teil ----
  console.log('abandon');
  {
    const { contexte, page } = await ouvrir(navigateur, 390);
    await page.getByRole('button', { name: 'Démarrer l’examen' }).click();
    await phase(page, 'anamnese');
    await page.getByRole('button', { name: 'Abandonner' }).click();
    await page.getByRole('button', { name: 'Démarrer l’examen' }).waitFor({ timeout: 15_000 });
    await page.goto(`${BASE}/#/historique`);
    await page.waitForSelector('main', { timeout: 15_000 }); await avance(page, 1_000);
    if (await page.getByText('Examen interrompu').count()) ko('abandon pendant l’Anamnese : quelque chose est écrit'); else ok('abandon pendant l’Anamnese : rien n’est écrit');
    await page.goto(`${BASE}/#/examen`);
    await page.getByRole('button', { name: 'Démarrer l’examen' }).waitFor({ timeout: 30_000 });
    await page.waitForFunction(() => !document.querySelector('button.btn-primary:disabled'), null, { timeout: 30_000 });
    await page.getByRole('button', { name: 'Démarrer l’examen' }).click();
    await phase(page, 'anamnese');
    await avance(page, 20 * 60_000); await phase(page, 'transition');
    await page.getByRole('button', { name: 'Abandonner' }).click();
    await page.getByRole('button', { name: 'Démarrer l’examen' }).waitFor({ timeout: 15_000 });
    await page.goto(`${BASE}/#/historique`);
    await page.getByText('Examen interrompu').waitFor({ timeout: 15_000 }).then(() => ok('abandon après l’Anamnese : « Examen interrompu » à l’Historique'), () => ko('abandon après l’Anamnese : absent de l’Historique'));
    await contexte.close();
  }
} catch (e) {
  ko(String(e?.message ?? e).split('\n')[0]);
} finally {
  await navigateur?.close();
  try { process.kill(-serveur.pid, 'SIGKILL'); } catch { /* déjà arrêté */ }
}
for (const f of fautes) console.log(`KO ${f}`);
process.exit(fautes.length ? 1 : 0);
