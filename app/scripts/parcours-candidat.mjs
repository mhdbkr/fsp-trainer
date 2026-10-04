#!/usr/bin/env node
// ============================================================================
// C6 — LE CANDIDAT SYNTHÉTIQUE (série 3, FB3-F1/F2).
//
// Une candidate FSP joue 14 jours ouvrés de préparation EN ACCÉLÉRÉ, à travers
// l'interface d'un BUILD servi par `vite preview`, contre le Supabase LOCAL.
// L'horloge du navigateur est pilotée par Playwright (`page.clock`) : l'app lit
// l'heure par `lib/clock` → `Date.now()`, donc « le jour 2 » se joue sans
// toucher `src/`. Chaque jour, les invariants sont vérifiés DEPUIS LE DOM de
// l'app (et la base IndexedDB qu'elle a remplie) — jamais par un import de
// module. Le rapport direction est écrit dans app/docs/reports/c6-parcours-<date>.md.
//
//   node scripts/parcours-candidat.mjs --env-file <.env du Supabase LOCAL>
//        [--port 5192] [--days 14] [--no-build] [--shots <dossier>] [--out <rapport.md>]
//
// Sortie : 0 si tous les invariants tiennent ; 1 si l'un est KO (un VRAI bug de
// l'app, listé en tête du rapport) ; 2 si le harnais lui-même est en défaut.
// Prérequis : Supabase local lancé (jamais arrêté ni réinitialisé ici),
// Playwright (PLAYWRIGHT_CORE ou paquet local), Chromium installé.
// ============================================================================
import process from 'node:process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  assertLocalSupabase, barre, buildApp, idb, loadChromium, readEnvFile, rows, startPreview, texte, until, warmContent,
} from './parcours-lib.mjs';
import { Rapport } from './parcours-rapport.mjs';
import { accueil, carteRetourIA, choisirMode, cocher, configurer, drill, ficheLue, jouerPartie, programmeDuMatin } from './parcours-actes.mjs';

const APP = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const PORT = Number(arg('--port', 5192));
const NB_JOURS = Number(arg('--days', 14));
const SHOTS = arg('--shots', path.join(os.tmpdir(), 'c6-captures'));   // jamais dans le dépôt
const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();   // date LOCALE
const OUT = arg('--out', path.join(APP, 'docs/reports', `c6-parcours-${TODAY}.md`));
const ENV_FILE = arg('--env-file', fs.existsSync(path.join(APP, '.env')) ? path.join(APP, '.env') : null);
const T0 = Date.now();

/**
 * Bugs RÉELS déjà trouvés par ce parcours et NON corrigés (l'app est hors du périmètre du harnais).
 * Même contrat qu'un `it.fails` : le KO est attendu et ne fait pas échouer le code de sortie ; il
 * est listé en tête du rapport avec sa preuve. Si l'invariant repasse au vert, la sortie est 1 :
 * il faut retirer l'entrée ici, sinon le bug corrigé ne serait plus gardé.
 */
const CONNUS = {
  D5s: 'BUG-C6-1 — les 3 simulations de démonstration (« sim-demo-* », data/seed.ts ensureDemoData) restent dans la base de la candidate anonyme et sont comptées dans les Stats dès sa première séance : « 3 simulations complètes » avant d\'avoir joué une seule partie complète, scores par axe compris (lib/stats.ts, features/stats/StatsPage.tsx).',
};

const DOW = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const long = (d) => `${DOW[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;

/** Les jours ouvrés de la persona : lundi 5 octobre 2026 et suivants, week-ends passés. */
function joursOuvres(n) {
  const out = [];
  for (let d = new Date('2026-10-05T08:10:00'); out.length < n; d.setDate(d.getDate() + 1)) if (d.getDay() % 6 !== 0) out.push(new Date(d));
  return out;
}

async function main() {
  if (!ENV_FILE) throw new Error('--env-file requis (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY du Supabase LOCAL).');
  const env = readEnvFile(ENV_FILE);
  const supabaseUrl = env.VITE_SUPABASE_URL;
  if (!supabaseUrl || !env.VITE_SUPABASE_ANON_KEY) throw new Error(`${ENV_FILE} ne porte pas VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.`);
  assertLocalSupabase(supabaseUrl);                       // « jamais la prod »
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  if (!argv.includes('--no-build')) {
    console.log('build (Supabase local)…');
    buildApp(APP, { VITE_SUPABASE_URL: supabaseUrl, VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY, VITE_AUTH_MODE: '' });
  }
  await warmContent(supabaseUrl, env.VITE_SUPABASE_ANON_KEY);
  const server = await startPreview(APP, PORT);
  const browser = await (await loadChromium(APP)).launch({ headless: true });
  let rapport;
  try { rapport = await parcours({ browser, base: server.base, supabaseUrl }); }
  finally { await browser.close().catch(() => {}); server.stop(); }
  rapport.write(OUT);
  const tous = rapport.tousLesChecks();
  // Faux vert : un parcours qui n'a rien joué ou n'a pas évalué ce qu'il prétend garder ne prouve rien (sortie 2 = harnais en défaut).
  const attendus = { D7: 1, D8: 1, ...(NB_JOURS >= 3 ? { D10: 1 } : {}), ...(NB_JOURS >= 7 ? { D9: 1 } : {}) };
  const manquants = Object.entries(attendus).filter(([id, n]) => tous.filter((x) => x.id === id).length < n).map(([id]) => id);
  if (NB_JOURS >= 14 && rapport.jouees < 10) manquants.push(`parties jouées (${rapport.jouees} < 10)`);
  if (manquants.length) { console.error(`HARNAIS EN DÉFAUT : vérification(s) jamais évaluée(s) — ${manquants.join(', ')} : faux vert écarté.`); process.exit(2); }
  const nouveaux = tous.filter((x) => !x.ok && !x.connu);
  const connusOk = [...new Set(tous.filter((x) => x.ok && CONNUS[x.id]).map((x) => x.id))];
  const connusKo = [...new Set(tous.filter((x) => !x.ok && x.connu).map((x) => x.id))];
  console.log(`\nRapport : ${OUT}\n${tous.filter((x) => x.ok).length}/${tous.length} vérifications OK en ${rapport.meta.dureeS} s ; ${connusKo.length} bug(s) réel(s) connu(s) ouvert(s) : ${connusKo.join(', ') || 'aucun'}.`);
  for (const x of nouveaux) console.log(`KO  ${x.id} (${x.jour}) — ${x.detail}`);
  for (const id of connusOk) console.log(`CONNU REPASSÉ AU VERT  ${id} — retirer de CONNUS`);
  process.exit(nouveaux.length || connusOk.length ? 1 : 0);
}

async function parcours({ browser, base, supabaseUrl }) {
  const jours = joursOuvres(NB_JOURS);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const erreurs = [], bruit = [];
  // Une transition de vue avortée est un artefact de l'horloge simulée (la mise à jour du DOM dépasse les 4 s
  // d'une horloge qu'on fait sauter) : mesuré une fois sur trois exécutions. Noté, pas compté comme un bug.
  const VUE_AVORTEE = /Transition was aborted|DOM update timed out/;
  page.on('pageerror', (e) => (VUE_AVORTEE.test(e.message) ? bruit : erreurs).push(`pageerror : ${String(e.message).slice(0, 200)}`));
  page.on('console', (m) => {
    const t = m.text();
    // Le bruit d'environnement documenté (external-ai.spec.md) n'est pas une erreur applicative.
    if (m.type() === 'error' && !/favicon|Failed to load resource|realtime|net::ERR/i.test(t)) erreurs.push(`console.error : ${t.slice(0, 200)}`);
  });
  await page.clock.install({ time: jours[0] });

  const rapport = new Rapport({
    nbJours: NB_JOURS, date: TODAY, dureeS: 0,
    persona: 'Léa, candidate FSP médecine (diplôme hors UE) ; 2 h par jour ; programme de 8 semaines, intensité moyenne ; d\'abord par Teil, puis cas complets ; deux jours manqués ; un drill libre ; une partie interrompue ; une partie avec le lanceur IA ouvert.',
    build: 'npm run build', supabase: supabaseUrl,
    premierJour: iso(jours[0]), dernierJour: iso(jours[jours.length - 1]),
    contenu: 'palier gratuit tel que le serveur local le publie (12 cas, 3 Teile chacun) — ce que voit un·e candidat·e anonyme. Aucun compte n\'est créé.',
  });
  // Le registre de la candidate : la VÉRITÉ (ce qu'elle a vraiment fait) à laquelle l'app est comparée.
  const grand = { exercices: 0, completes: 0, parties: 0, joursTravailles: new Set(), figes: new Map(), ouverts: [] };
  const c = { page, base, rapport, grand, erreurs, jourIso: '' };
  Object.defineProperty(rapport, 'jouees', { get: () => grand.parties + grand.completes });

  c.capture = async (nom) => { const f = path.join(SHOTS, `${nom}.png`); await page.screenshot({ path: f, fullPage: true }).catch(() => {}); return f; };
  c.aller = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await sleep(250); };
  /** Un invariant vérifié : OK/KO + capture si KO. Une erreur de mesure est un KO nommé comme tel. */
  c.verifie = async (id, titre, fn) => {
    let ok = false, detail = '';
    try { const r = await fn(); ok = r === true || (!!r && r.ok === true); detail = (r && r.detail) || ''; }
    catch (e) { detail = `erreur de mesure : ${e.message}`; }
    const connu = CONNUS[id];
    const shot = ok ? undefined : await c.capture(`KO-${id}-${rapport.cur.etiquette.replace(/\W+/g, '_')}`);
    rapport.check(id, titre, ok, detail, shot, connu);
    if (!ok) console.log(`   ${connu ? 'BUG CONNU' : 'KO'} ${id} : ${detail}`);
    if (ok && connu) console.log(`   ${id} repasse au vert : le bug connu est corrigé — retirer ${id} de CONNUS`);
    return ok;
  };
  c.mesurePlan = async (quand) => {
    await c.aller('/programme');
    await until(page, () => /min prévues|Aucun programme|Jour off|Journée terminée|Rien/.test(document.body.innerText), 'programme');
    return { quand, b: await barre(page), rs: await rows(page), plans: await idb(page, 'day_plans') };
  };

  /** Elle ouvre l'app le matin : l'horloge passe au jour J, l'onglet est rechargé. */
  const ouvrir = async (date) => {
    await page.clock.setSystemTime(date);
    await page.goto(`${base}/#/`);
    await page.reload();
    await until(page, () => document.querySelector('main') && !/Chargement…/.test(document.body.innerText), 'app chargée', 40000);
    await sleep(500);
  };
  const premiereSim = (rs) => rs.findIndex((r) => !r.fait && r.cta === 'Lancer');
  /** Joue la n-ième simulation non faite du plan (la candidate suit le plan, dans l'ordre). */
  const jouer = async (opts) => {
    await c.aller('/programme');
    await until(page, () => /min prévues/.test(document.body.innerText), 'plan');
    const i = premiereSim(await rows(page));
    if (i < 0) { rapport.fait('Plus de simulation à jouer dans le plan.'); return null; }
    return jouerPartie(c, i, opts);
  };
  const cocheUneAutre = async () => {
    await c.aller('/programme');
    await until(page, () => /min prévues/.test(document.body.innerText), 'plan');
    const rs = await rows(page);
    const i = rs.findIndex((r) => !r.fait && r.label !== 'Fachbegriffe');
    if (i < 0) return;
    await cocher(c, i);
  };

  // ------------------------- le soir : vrai quelle qu'ait été la journée -------------------------
  const soir = async (n) => {
    await c.aller('/historique');
    await until(page, () => document.body.innerText.includes('Journal d\'entraînement'), 'historique');
    const tuiles = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.label')]
      .filter((l) => ['Exercices', 'Jours travaillés'].includes(l.textContent.trim())).map((l) => [l.textContent.trim(), l.nextElementSibling?.textContent.trim()])));
    const events = await idb(page, 'training_events');
    await c.verifie('D5', 'tout exercice (plan ou libre) apparaît dans l\'historique et dans les stats', () => ({
      ok: Number(tuiles['Exercices']) === grand.exercices && events.length === grand.exercices && Number(tuiles['Jours travaillés']) === grand.joursTravailles.size,
      detail: `la candidate a fait ${grand.exercices} exercice(s) sur ${grand.joursTravailles.size} jour(s) ; l'historique affiche ${tuiles['Exercices']} / ${tuiles['Jours travaillés']} jour(s) ; le journal en stocke ${events.length}`,
    }));
    rapport.vu(`Historique : « ${tuiles['Exercices']} exercices · ${tuiles['Jours travaillés']} jours travaillés ».`);

    // Les stats : le compte « simulations complètes · par partie » est celui de ce que la candidate a joué.
    await c.aller('/stats');
    await until(page, () => /Stats \/ Performances/.test(document.body.innerText), 'stats');
    const st = (await texte(page)).match(/(\d+) simulations complètes · (\d+) par partie/);
    const demos = (await idb(page, 'simulations')).filter((x) => x.id.startsWith('sim-demo-'));
    const dC = demos.filter((x) => (x.scope ?? (Object.keys(x.parts).length >= 2 ? 'full' : 'teil')) === 'full').length, dP = demos.length - dC;
    const lu = st ? `stats : ${st[1]} complètes · ${st[2]} par partie` : 'compte absent';
    await c.verifie('D5s', 'les stats comptent exactement ce que la candidate a joué', () => ({
      ok: !!st && Number(st[1]) === grand.completes && Number(st[2]) === grand.parties,
      detail: `${lu} ; jouées : ${grand.completes} complètes · ${grand.parties} par partie ; démos présentes en base : ${demos.length}`,
    }));
    await c.verifie('D5r', 'ce que la candidate a joué est compté et classé juste dans les stats (complète / par partie), démos déduites', () => ({
      ok: !!st && Number(st[1]) - dC === grand.completes && Number(st[2]) - dP === grand.parties,
      detail: `${lu} − démos (${dC} complètes, ${dP} par partie) ; jouées : ${grand.completes} complètes · ${grand.parties} par partie`,
    }));

    const plans = await idb(page, 'day_plans');
    const struct = (p) => JSON.stringify({ mode: p.mode, seed: p.seed, targetMin: p.targetMin, t: p.tasks.filter((t) => !t.id.startsWith('r')).map((t) => [t.id, t.kind, t.caseId, t.teil, t.label, t.estMin]) });
    await c.verifie('D6', 'un jour figé est identique à sa matérialisation, plus tard comme après rechargement', () => {
      const bouge = plans.filter((p) => grand.figes.has(p.date) && grand.figes.get(p.date) !== struct(p)).map((p) => p.date);
      return { ok: !bouge.length, detail: bouge.length ? `plan(s) modifié(s) après coup : ${bouge.join(', ')}` : `${plans.length} plan(s) figé(s) intacts` };
    });
    for (const p of plans) if (!grand.figes.has(p.date)) grand.figes.set(p.date, struct(p));
    await c.verifie('D11', 'aucun jour non ouvert n\'a de plan (ni passé rétroactif, ni futur)', () => {
      const intrus = plans.filter((p) => !grand.ouverts.includes(p.date)).map((p) => p.date);
      return { ok: !intrus.length, detail: intrus.length ? `plan(s) pour des jours non ouverts : ${intrus.join(', ')}` : `${plans.length} plan(s), tous de jours ouverts` };
    });
    await c.verifie('D12', 'aucune erreur JavaScript pendant la journée', () => ({ ok: !erreurs.length, detail: erreurs.slice(0, 3).join(' · ') || 'console propre' }));
    erreurs.length = 0;
    if (bruit.length) { rapport.observation(`${bruit.length} transition(s) de vue avortée(s) (« ${bruit[0]} ») — attribuée à l'horloge simulée, non comptée.`); bruit.length = 0; }
    await c.capture(`soir-${String(n).padStart(2, '0')}`);
  };

  // ======================================= LE PARCOURS =======================================
  try {
  for (let n = 1; n <= NB_JOURS; n++) {
    const date = jours[n - 1];
    rapport.jour(`jour ${n} · ${long(date)}`, n === 4 || n === 5 ? 'Journée manquée.' : '');
    console.log(`\n== jour ${n} · ${long(date)}`);
    if (n === 4 || n === 5) { rapport.fait('N\'ouvre pas l\'app (journée manquée).'); await page.clock.setSystemTime(date); continue; }

    c.jourIso = iso(date);
    await ouvrir(date);
    grand.ouverts.push(c.jourIso);

    if (n === 1) {
      rapport.vu('Première ouverture : « Crée ton programme de révision ».');
      await configurer(c);
    }
    await accueil(c);
    await programmeDuMatin(c, c.jourIso);

    // Après un trou : le rattrapage est PROPOSÉ, jamais imposé.
    if (n === 6) {
      await c.aller('/programme');
      const propose = /Les reprendre/.test(await texte(page));
      rapport.vu(propose ? 'Programme — le rattrapage des tâches non faites du dernier jour ouvert est PROPOSÉ (« Les reprendre » / « Non, laisser »).' : 'Programme — aucun rattrapage proposé.');
      if (propose) {
        const avant = (await barre(page)).total;
        await page.getByRole('button', { name: /Non, laisser/ }).click();
        await sleep(500);
        rapport.fait('Refuse le rattrapage (« Non, laisser »).');
        await c.verifie('D13', 'le rattrapage est proposé, jamais imposé : refusé, le plan ne bouge pas et la proposition ne revient pas', async () => {
          const ap = (await barre(page)).total;
          await page.reload(); await sleep(900);
          return { ok: ap === avant && !/Les reprendre/.test(await texte(page)), detail: `${avant} → ${ap} tâches ; proposition ${/Les reprendre/.test(await texte(page)) ? 'revenue' : 'close après rechargement'}` };
        });
      }
    }

    switch (n) {
      case 1: await drill(c, { cartes: 4, depuis: 'plan' }); await jouer({ qualite: 0.3 }); await cocheUneAutre(); break;
      case 2: await jouer({ qualite: 0.4, doubleSave: true }); await jouer({ qualite: 0.5 }); break;
      case 3: await jouer({ qualite: 0.5, interrompre: 'laufend' }); await jouer({ qualite: 0.55, interrompre: 'bilan' }); break;
      case 6: await jouer({ qualite: 0.6, doubleSave: true }); await drill(c, { cartes: 4, depuis: 'glossaire' }); break;
      case 7:
        await jouer({ qualite: 0.6, ia: 'pendant' }); await jouer({ qualite: 0.65, retourBilan: true });
        await choisirMode(c, 'Cas complet');
        break;
      case 8: await jouer({ qualite: 0.65 }); await cocheUneAutre(); break;
      case 9: {
        const t = await jouer({ ia: 'abandon' });
        if (t?.abandon) await carteRetourIA(c, t.trace);
        await jouer({ qualite: 0.7 });
        break;
      }
      case 10: await jouer({ qualite: 0.8 }); await ficheLue(c); break;
      default: await jouer({ qualite: Math.min(0.95, 0.5 + n * 0.03) }); if (n % 2) await cocheUneAutre();
    }
    await soir(n);
    if (n === NB_JOURS) {
      rapport.fait('Revient à l\'accueil pour faire le point.');
      const fin = await accueil(c);
      const [events, plans] = [await idb(page, 'training_events'), await idb(page, 'day_plans')];
      rapport.vu(`Bilan de la préparation : ${events.length} exercices sur ${new Set(events.map((e) => new Date(e.at).toDateString())).size} jours, ${plans.length} jours figés sur ${NB_JOURS} jours ouvrés (2 manqués).`);
      void fin;
    }
  }

  } catch (e) {                                              // le harnais lui-même est en défaut : on garde la preuve
    const f = await c.capture('HARNAIS-defaut');
    e.message += `\n   page : ${page.url()} · capture : ${f}\n   texte : ${(await texte(page).catch(() => '')).replace(/\n+/g, ' | ').slice(0, 500)}`;
    throw e;
  }
  rapport.meta.dureeS = Math.round((Date.now() - T0) / 1000);
  await ctx.close();
  return rapport;
}

main().catch((e) => { console.error('HARNAIS EN DÉFAUT :', e.message); process.exit(2); });
