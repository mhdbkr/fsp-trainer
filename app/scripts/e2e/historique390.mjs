#!/usr/bin/env node
// ============================================================================
// Garde-fou S4-6 : la page Historique (carnet de séances) ne déborde pas à droite sur un téléphone de 390 et 375 px,
// reste courte avec un long journal (68 séances : seules les deux dernières semaines sont dépliées), et chaque exercice
// du journal y est montré une fois, toutes séances dépliées. Mesuré dans le DOM de l'app.
//
// Sans Supabase : `vite` reçoit une URL factice (aucun réseau). Le journal est SEMÉ comme la synchro l'écrirait
// (`progress_events` : `simulation.completed`, `training.logged`, `term.favorited`) puis l'app le reprojette au
// démarrage ; les mots cherchés vont dans `termes_cherches` (local). Aucune mesure ne lit un module importé.
//   PLAYWRIGHT_CORE=<dossier de playwright-core> [CHROMIUM_PATH=<chromium>] node scripts/e2e/historique390.mjs [--port 5293] [--captures]
// `--captures` : écrit docs/reports/s4-6-historique-{390,1280}.png. Sortie : 0 si tout tient, 1 sinon.
// ============================================================================
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { loadChromium } from '../parcours-lib.mjs';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const argv = process.argv.slice(2);
const PORT = argv.includes('--port') ? Number(argv[argv.indexOf('--port') + 1]) : 5293;
const BASE = `http://localhost:${PORT}`;
const CAPTURES = argv.includes('--captures');

const serveur = spawn(`${APP}node_modules/.bin/vite`, ['--port', String(PORT), '--strictPort'], {
  cwd: APP, stdio: 'ignore', detached: true,
  env: { ...process.env, VITE_SUPABASE_URL: 'http://127.0.0.1:9', VITE_SUPABASE_ANON_KEY: 'factice' },
});

/** Hauteur maximale de `main` à 390 px, séances anciennes repliées : mesurée à 1 600 px ; dépliées, 7 510 px (et
 *  12 950 px pour les 65 séances de la revue direction). */
const HAUTEUR_MAX_390 = 2400;
const ANCIENNES = 60;

/** Le journal de la démonstration : deux séances aujourd'hui et hier, trois parties plus anciennes (les oublis), et
 *  60 drills d'avant les deux dernières semaines, un par jour (60 séances repliées). */
async function semer(page) {
  await page.evaluate(async (ANCIENNES) => {
    const { db } = await import('/src/db/db.ts');
    const { seedCases } = await import('/src/data/seedCases.ts');
    const cases = seedCases();
    await db.cases.bulkPut(cases);
    await db.meta.put({ key: 'contentVersion', value: 1 });
    const srs = { state: 'Neu', dueDate: 0, interval: 0, ease: 2.5, reps: 0, lapses: 0 };
    await db.fachbegriffe.bulkPut(['Aszites', 'Caput medusae', 'Ikterus', 'Splenomegalie'].map((term) => ({
      id: `fb-${term.toLowerCase().replace(/\s/g, '-')}`, term, translationSimple: term, specialty: 'Gastroenterologie',
      pathologyTags: [], centers: [], linkedCaseIds: [], srs,
    })));
    const [a, b, c] = [cases.find((x) => /Leberzirrhose/.test(x.name)) ?? cases[0], cases[1], cases[2]];
    const MIN = 60_000, J = 24 * 60 * MIN;
    const t0 = Date.now() - 3 * 60 * MIN;                                   // la séance du jour a commencé il y a 3 h
    const part = (score, manques = []) => ({
      done: true, durationSec: 900, feeling: score, contentPct: score, officialPct: score,
      checklist: ['x-allergien', 'x-noxen', 'x-medikamente'].map((id) => ({ id, label: id, checked: !manques.includes(id) })),
    });
    const sim = (id, caseId, date, parts) => ({
      id, caseId, date, parts, notes: {}, prioritizedCorrections: [], passed: true, assistance: 'autonome', layer: 2,
      scope: Object.keys(parts).length === 3 ? 'full' : 'teil', ...(Object.keys(parts).length === 1 ? { teil: Object.keys(parts)[0] } : {}),
    });
    const ev = (type, subject_id, payload, at) => ({ id: crypto.randomUUID(), user_id: 'local', type, subject_id, payload, occurred_at: new Date(at).toISOString() });
    const oubli = ['x-allergien', 'x-noxen'];
    await db.progress_events.bulkPut([
      ev('simulation.completed', 's-old1', sim('s-old1', b.id, t0 - 6 * J, { anamnese: part(64, oubli) }), t0 - 6 * J + 20 * MIN),
      ev('simulation.completed', 's-old2', sim('s-old2', c.id, t0 - 5 * J, { anamnese: part(58, oubli) }), t0 - 5 * J + 20 * MIN),
      ev('simulation.completed', 's-old3', sim('s-old3', b.id, t0 - 4 * J, { anamnese: part(70, oubli) }), t0 - 4 * J + 20 * MIN),
      // hier soir : un cas, puis un drill
      ev('simulation.completed', 's-hier', sim('s-hier', c.id, t0 - J, { anamnese: part(81), dokumentation: part(76) }), t0 - J + 35 * MIN),
      ev('training.logged', 'te-drill-hier', { at: t0 - J + 45 * MIN, kind: 'drill', teile: [], source: 'libre', spentMin: 9 }, t0 - J + 54 * MIN),
      // aujourd'hui : Leberzirrhose (3 Teile, Fallvorstellung faible, deux oublis), un second cas, un drill
      ev('simulation.completed', 's-jour', sim('s-jour', a.id, t0, { anamnese: part(72, oubli), dokumentation: part(66), fallvorstellung: part(41) }), t0 + 45 * MIN),
      ev('simulation.completed', 's-jour2', sim('s-jour2', b.id, t0 + 50 * MIN, { anamnese: part(88) }), t0 + 65 * MIN),
      ev('training.logged', 'te-drill-jour', { at: t0 + 75 * MIN, kind: 'drill', teile: [], source: 'libre', spentMin: 8 }, t0 + 83 * MIN),
      ev('term.favorited', 'fb-aszites', {}, t0 + 10 * MIN),
      ev('term.favorited', 'fb-caput-medusae', {}, t0 + 20 * MIN),
      ...Array.from({ length: ANCIENNES }, (_, k) =>
        ev('training.logged', `te-vieux-${k}`, { at: t0 - (15 + k) * J, kind: 'drill', teile: [], source: 'libre', spentMin: 6 }, t0 - (15 + k) * J + 6 * MIN)),
    ]);
    // `simulations` et `favorites` sont écrits à la fin d'une partie et à l'émission ; le démarrage ne les reconstruit pas.
    await db.simulations.bulkPut((await db.progress_events.where('type').equals('simulation.completed').toArray()).map((e) => e.payload));
    await db.favorites.bulkPut([{ termId: 'fb-aszites', since: new Date(t0 + 10 * MIN).toISOString() }, { termId: 'fb-caput-medusae', since: new Date(t0 + 20 * MIN).toISOString() }]);
    await db.termes_cherches.bulkAdd([
      { at: t0 + 5 * MIN, terme: 'Ikterus' }, { at: t0 + 30 * MIN, terme: 'Ikterus' },
      { at: t0 + 31 * MIN, terme: 'Splenomegalie' }, { at: t0 + 33 * MIN, terme: 'Splenomegalie' },
    ]);
  }, ANCIENNES);
}

const fautes = [];
let navigateur;
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* pas encore */ } await sleep(500); }
  navigateur = await (await loadChromium(APP)).launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const largeur of [390, 375, 1280]) {
    const page = await navigateur.newPage({ viewport: { width: largeur, height: largeur > 1000 ? 900 : 844 } });
    await page.goto(`${BASE}/#/`);
    await semer(page);
    await page.goto(`${BASE}/#/historique`);
    await page.reload();                                                     // la synchro de démarrage reprojette le journal
    await page.waitForFunction(() => document.querySelectorAll('main article').length >= 2, null, { timeout: 60_000 });
    await sleep(600);
    const mesurer = () => page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const main = document.querySelector('main');
      const ids = [...document.querySelectorAll('[data-te]')].flatMap((n) => (n.getAttribute('data-te') ?? '').split(' ').filter(Boolean));
      return {
        hauteur: main.scrollHeight,
        plusAnciennes: document.querySelector('[data-plus-anciennes]')?.textContent ?? '',
        horsEcran: [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5); }).map((e) => e.tagName + '.' + String(e.className).slice(0, 40)),
        debord: main.scrollWidth - Math.round(main.getBoundingClientRect().width),
        ids, distincts: new Set(ids).size,
        seances: document.querySelectorAll('main article').length,
        semaine: document.querySelector('[data-semaine]')?.textContent ?? '',
        actions: [...document.querySelectorAll('main article a.btn-outline, main article button[title="Envoyer au drill"]')].map((a) => a.textContent.trim()),
        favoris: [...document.querySelectorAll('main article [data-favori]')].map((f) => f.textContent.trim()),
        petites: [...document.querySelectorAll('main article a.btn-outline, main article button[title="Envoyer au drill"], main [data-plus-anciennes]')].filter((a) => a.getBoundingClientRect().height < 44).length,
        liens: [...document.querySelectorAll('main a')].map((a) => a.getAttribute('href')),
      };
    });
    const verifier = (m, etat) => {
      console.log(`${largeur} px, ${etat} : ${m.seances} séances, ${m.ids.length} exercices (${m.distincts} distincts), hauteur ${m.hauteur} px, ${m.horsEcran.length} élément(s) hors écran, débord ${m.debord} px, ${m.petites} cible(s) < 44 px`);
      if (m.horsEcran.length || m.debord > 0) fautes.push(`${largeur} px, ${etat} : la page déborde (${m.horsEcran.slice(0, 5).join(', ')} ; ${m.debord} px)`);
      if (m.petites) fautes.push(`${largeur} px, ${etat} : ${m.petites} action(s) sous 44 px`);
      if (new Set(m.liens).size !== m.liens.length) fautes.push(`${largeur} px, ${etat} : deux liens vers la même adresse (${m.liens.join(' ')})`);
    };
    const replie = await mesurer();
    verifier(replie, 'replié');
    console.log(`   semaine : « ${replie.semaine} »`);
    console.log(`   actions : ${replie.actions.join(' | ')}`);
    console.log(`   favoris : ${replie.favoris.join(' | ')}`);
    console.log(`   bouton : « ${replie.plusAnciennes} »`);
    if (replie.favoris.length !== 2) fautes.push(`${largeur} px : ${replie.favoris.length} favori(s) de séance montré(s) pour 2`);
    if (replie.seances !== 5) fautes.push(`${largeur} px : ${replie.seances} séances dépliées pour les 5 des deux dernières semaines`);
    if (replie.plusAnciennes !== `Voir les ${ANCIENNES} séances plus anciennes`) fautes.push(`${largeur} px : bouton « ${replie.plusAnciennes} »`);
    if (largeur === 390 && replie.hauteur > HAUTEUR_MAX_390) fautes.push(`390 px : la page fait ${replie.hauteur} px pour ${HAUTEUR_MAX_390} au plus`);
    if (CAPTURES && largeur !== 375) await page.screenshot({ path: `${APP}docs/reports/s4-6-historique-${largeur}.png`, fullPage: true });
    await page.click('[data-plus-anciennes]');
    await page.waitForFunction((n) => document.querySelectorAll('main article').length === n, 5 + ANCIENNES, { timeout: 10_000 });
    const deplie = await mesurer();
    verifier(deplie, 'déplié');
    const total = 8 + ANCIENNES;
    if (deplie.ids.length !== total || deplie.distincts !== total) fautes.push(`${largeur} px : ${deplie.ids.length} exercices montrés (${deplie.distincts} distincts) pour ${total} dans le journal`);
    if (largeur === 390) {
      // « Revoir mes N oublis » ouvre l'écran de fin de la partie SUR la carte des oublis, qui en montre exactement N.
      const n = Number((await page.textContent('main a:has-text("Revoir mes")')).match(/\d+/)[0]);
      await page.click('main a:has-text("Revoir mes")');
      await page.waitForSelector('#oublis', { timeout: 15_000 });
      await sleep(800);
      const lire = () => page.evaluate(() => {
        const carte = document.getElementById('oublis');
        const r = carte.getBoundingClientRect();
        const main = document.querySelector('main');
        return {
          haut: Math.round(r.top), bas: Math.round(r.bottom), ecran: innerHeight, defile: Math.round(main.scrollTop),
          butee: Math.round(main.scrollHeight - main.clientHeight), manquees: (carte.textContent.match(/encore manquée/g) ?? []).length,
        };
      });
      const o = await lire();
      // Témoin : la même partie ouverte SANS `voir=oublis` — c'est le paramètre qui amène la carte, pas la mise en page.
      await page.goto(page.url().replace('&voir=oublis', ''));
      await page.reload();
      await page.waitForSelector('#oublis', { timeout: 15_000 });
      await sleep(800);
      const t = await lire();
      console.log(`   « Revoir mes ${n} oublis » → carte de ${o.haut} à ${o.bas} px (écran ${o.ecran}), main défilé de ${o.defile}/${o.butee} px, ${o.manquees} « encore manquée » ; sans le paramètre : ${t.haut} à ${t.bas} px, défilé ${t.defile} px`);
      if (o.manquees !== n) fautes.push(`la carte des oublis montre ${o.manquees} « encore manquée » pour ${n} annoncés`);
      // À l'écran : en haut, ou entière quand la page est en butée (la carte est près de la fin de l'écran de fin).
      if (o.haut < 0 || !(o.haut <= 200 || (o.bas <= o.ecran && o.defile === o.butee))) fautes.push(`la carte des oublis n'est pas amenée à l'écran (${o.haut}–${o.bas} px, défilé ${o.defile}/${o.butee})`);
      if (t.defile !== 0) fautes.push(`sans « voir=oublis », l'écran de fin défile quand même (${t.defile} px)`);
      if (t.bas <= t.ecran) console.log('   (témoin : la carte tient déjà dans l’écran sans défiler — le défilement n’est pas départagé ici)');
    }
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
