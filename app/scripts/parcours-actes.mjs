// ============================================================================
// Les GESTES de la candidate synthétique : ce qu'elle clique, dans l'ordre où
// un humain le fait. Chaque geste observe l'app depuis son DOM et sa base
// IndexedDB (parcours-lib.mjs) et vérifie, chemin faisant, les invariants qui
// ne se voient que PENDANT le geste (la fin de partie, la reprise, la double
// validation, le lanceur IA). `c` = le contexte posé par parcours-candidat.mjs.
// ============================================================================
import { setTimeout as sleep } from 'node:timers/promises';
import { barre, hero, idb, meta, rows, texte, until } from './parcours-lib.mjs';

const ROW = 'div.rounded-xl.border.transition-colors';
const ORDRE = { vorbereitung: 0, laufend: 1, bilanz: 2, checkliste: 3, arztbrief: 4, gespeichert: 5 };

const btn = (page, re) => page.getByRole('button', { name: re }).first();
const present = (page, re) => btn(page, re).count().then((n) => n > 0);

/** Programme → « Générer mon programme » ; la journée s'ouvre SANS rechargement (I1). */
export async function configurer(c) {
  await c.aller('/programme');
  await until(c.page, () => /Aucun programme encore/.test(document.body.innerText), 'écran de configuration');
  await btn(c.page, /Générer mon programme/).click();
  const b = await until(c.page, () => { const m = document.body.innerText.match(/(\d+)\/(\d+) faits? · (\d+) min prévues/); return m ? { done: +m[1], total: +m[2], min: +m[3] } : null; }, 'plan du jour sans rechargement (I1)');
  c.rapport.fait('Configure son programme (8 semaines, 2 h par jour, intensité moyenne) et le génère.');
  c.rapport.vu(`Le plan du jour s'ouvre aussitôt, sans rechargement : ${b.total} tâches, ${b.min} min prévues.`);
  return b;
}

/** Programme → Avancement : « Par partie » ↔ « Cas complet ». */
export async function choisirMode(c, nom) {
  await c.aller('/programme');
  await until(c.page, () => /Avancement/.test(document.body.innerText), 'sélecteur Avancement');
  await c.page.getByLabel(/Avancement/).selectOption({ label: nom });
  await sleep(700);
  c.rapport.fait(`Passe l'avancement en « ${nom} » (le mode se fige jour par jour, à la prochaine ouverture).`);
}

/** Coche « ✓ Fait » sur la ligne `i`. INV-1 vu du DOM : rien n'est ajouté, rien n'est repris. */
export async function cocher(c, i) {
  await c.aller('/programme');
  await until(c.page, () => /min prévues/.test(document.body.innerText), 'plan');
  const av = { b: await barre(c.page), rs: await rows(c.page) };
  const cible = av.rs[i];
  await c.page.locator(ROW).nth(i).locator('[title="Marquer faite"]').click();
  await c.page.waitForFunction((n) => (document.body.innerText.match(/(\d+)\/\d+ faits?/) ?? [])[1] == n, av.b.done + 1, { timeout: 8000 });
  const ap = { b: await barre(c.page), rs: await rows(c.page) };
  c.grand.exercices++; c.grand.joursTravailles.add(c.jourIso);
  c.rapport.fait(`Coche « ${cible.label} » sans la jouer.`);
  await c.verifie('D1', 'cocher une tâche n\'en fait pas apparaître une autre', () => {
    const memes = JSON.stringify(av.rs.map((r) => r.label).sort()) === JSON.stringify(ap.rs.map((r) => r.label).sort());
    const ok = ap.b.done === av.b.done + 1 && ap.b.total === av.b.total && ap.b.min === av.b.min && memes;
    return { ok, detail: `${av.b.done}/${av.b.total} · ${av.b.min} min → ${ap.b.done}/${ap.b.total} · ${ap.b.min} min${memes ? '' : ' ; les sujets du jour ont changé'}` };
  });
}

/** Séance de Fachbegriffe : depuis la tâche du plan, ou librement depuis le glossaire. */
export async function drill(c, { cartes = 4, depuis = 'plan' } = {}) {
  if (depuis === 'plan') {
    await c.aller('/programme');
    await until(c.page, () => /min prévues/.test(document.body.innerText), 'plan');
    const i = (await rows(c.page)).findIndex((r) => r.label === 'Fachbegriffe' && !r.fait);
    if (i < 0) { c.rapport.fait('Pas de tâche Fachbegriffe à faire aujourd\'hui.'); return false; }
    await c.page.locator(ROW).nth(i).locator('a.btn-primary').click();
  } else await c.aller('/fachbegriffe/drill');
  await until(c.page, () => /Commencer|Rien à réviser/.test(document.body.innerText), 'écran du drill');
  if (!(await present(c.page, /Commencer/))) { c.rapport.fait('Le drill n\'a rien à proposer.'); return false; }
  await btn(c.page, /Commencer/).click();
  for (let k = 0; k < cartes; k++) {
    await until(c.page, () => /Fachbegriff ·/.test(document.body.innerText), 'carte');
    await c.page.clock.runFor(20_000);                                   // elle réfléchit 20 s par carte
    await c.page.keyboard.press('Space');
    await btn(c.page, /^Gut/).click({ timeout: 8000 });
    await sleep(350);
  }
  await c.page.getByText('✕ Quitter').first().click();
  await sleep(500);
  c.grand.exercices++; c.grand.joursTravailles.add(c.jourIso);
  c.rapport.fait(depuis === 'plan'
    ? `Fait sa séance de Fachbegriffe du plan (${cartes} cartes), puis quitte.`
    : `Drill LIBRE depuis le glossaire (${cartes} cartes, hors plan), puis quitte.`);
  return true;
}

/** Lecture libre d'une fiche Fachwissen, puis « Fiche lue » : un exercice HORS plan (D5). */
export async function ficheLue(c) {
  await c.aller('/fachwissen');
  await until(c.page, () => !!document.querySelector('main a[href*="fachwissen/"]'), 'liste des fiches');
  await c.page.locator('main a[href*="fachwissen/"]').first().click();
  await until(c.page, () => /Fiche lue/.test(document.body.innerText), 'fiche ouverte');
  await c.page.clock.runFor(150_000);                                  // elle lit deux minutes et demie
  await btn(c.page, /Fiche lue/).click();
  await until(c.page, () => /Noté dans ton historique/.test(document.body.innerText), 'lecture notée');
  c.grand.exercices++; c.grand.joursTravailles.add(c.jourIso);
  c.rapport.fait('Lit une fiche Fachwissen librement (hors plan) et clique « Fiche lue ».');
  c.rapport.vu(`Fiche : « ${(await texte(c.page)).match(/Noté dans ton historique · (\d+) min/)?.[0] ?? 'Noté dans ton historique'} ».`);
}

/** Ouvre le lanceur IA de la partie en cours et copie le prompt (pose la trace `externalAi.pending`). */
async function lanceurIA(c) {
  await btn(c.page, /Avec ton IA/).click();
  await c.page.getByRole('radiogroup', { name: /Ton IA/ }).waitFor({ timeout: 8000 });
  await c.page.getByRole('button', { name: /^Copier$/ }).click({ timeout: 8000 });
  const t0 = Date.now();
  let trace = null;
  while (!trace && Date.now() - t0 < 6000) { trace = await meta(c.page, 'externalAi.pending'); if (!trace) await sleep(150); }
  if (!trace) throw new Error('le lanceur IA n\'a pas posé de trace (externalAi.pending)');
  // Elle referme le panneau et revient à sa partie (ou la quitte, selon le scénario).
  await c.page.keyboard.press('Escape');
  if (await c.page.getByRole('dialog', { name: /avec ton IA/ }).count()) await btn(c.page, /Avec ton IA/).click();
  await c.page.getByRole('dialog', { name: /avec ton IA/ }).waitFor({ state: 'detached', timeout: 5000 });
  return trace;
}

const tickBoxes = (c, p) => c.page.evaluate((q) => {
  const cb = [...document.querySelectorAll('main input[type=checkbox]')];
  const k = Math.round(cb.length * q);
  cb.slice(0, k).forEach((x) => { if (!x.checked) x.click(); });
  return { k, n: cb.length };
}, p);

const echantillon = async (c) => {
  const l = await meta(c.page, 'lauf.aktiv');
  return l ? { id: l.id, z: l.zustand, teil: l.aktuellerTeil, joues: [...(l.teileGespielt ?? [])], sek: { ...(l.sekundenProTeil ?? {}) }, coches: (l.checkliste ?? []).filter((x) => x.checked).length } : null;
};

/**
 * Joue la ligne `i` du plan par l'interface. Options :
 *   qualite : part des critères cochés au bilan (0..1) — la candidate progresse
 *   interrompre : 'laufend' | 'bilan' — recharge l'onglet en pleine partie (INV-23)
 *   ia : 'pendant' (lanceur ouvert, partie finie dans l'app) | 'abandon' (lanceur ouvert, partie quittée)
 *   doubleSave : double clic sur « Enregistrer » (INV-22)
 *   retourBilan : « ← Revenir au bilan » une fois (régression NOMMÉE de l'automate)
 *   unTeil : s'arrête après la PREMIÈRE partie (« un Teil ici ») — S4-2 : la tâche de cas ne se coche pas, la ligne dit le reste
 *   libre : joue un cas HORS du plan, par son lien direct (« librement ») ; `i` est alors ignoré
 */
export async function jouerPartie(c, i, o = {}) {
  await c.aller('/programme');
  await until(c.page, () => /min prévues/.test(document.body.innerText), 'plan');
  const av = { b: await barre(c.page), rs: await rows(c.page), sims: (await idb(c.page, 'simulations')).length };
  const planAvant = (await idb(c.page, 'day_plans')).find((p) => p.date === c.jourIso);
  let ligne = av.rs[i], tache = o.libre ? null : planAvant?.tasks.filter((t) => t.doneAt === undefined)[0] ?? null;
  if (o.libre) {
    const auPlan = new Set((planAvant?.tasks ?? []).map((t) => t.caseId));
    const cas = (await idb(c.page, 'cases')).filter((x) => !auPlan.has(x.id)).sort((a, b) => (a.id < b.id ? -1 : 1))[c.grand.exercices % 5];
    if (!cas) { c.rapport.fait('Aucun cas hors du plan à jouer librement.'); return null; }
    ligne = { label: cas.name, cta: 'libre' };
    await c.aller(`/simulation/${cas.id}/pre`);
  } else {
    tache = planAvant?.tasks.find((t) => t.label === ligne.label && t.doneAt === undefined) ?? null;
    await c.page.locator(ROW).nth(i).locator('a.btn-primary').click();
  }
  // [S4-3] pré-simulation : un seul bouton « Démarrer » (simulation-run.md §10.1).
  await until(c.page, () => /Échauffement/.test(document.body.innerText) && /Démarrer/.test(document.body.innerText), 'pré-simulation');
  await btn(c.page, /Démarrer$/).click();
  await until(c.page, () => /Finir l/.test(document.body.innerText), 'runner');
  // [S4-3 fixeur I11] Le chrono du Teil de départ attend « Lancer le chrono » (les suivants démarrent seuls).
  if (await present(c.page, /Lancer le chrono/)) await btn(c.page, /Lancer le chrono/).click();

  const seq = [await echantillon(c)];
  const retours = new Set();                                  // régressions DEMANDÉES par la candidate (gestes nommés)
  const noter = async (explicite) => { const s = await echantillon(c); seq.push(s); if (explicite && s) retours.add(seq.length - 1); return s; };
  let nParties = 0, iaTrace = null, interrompu = false, teilsJoues = [];

  for (;;) {
    await c.page.clock.runFor(60_000 + 90_000 * nParties);   // elle joue ~1 à 4 minutes
    await noter();
    if (o.ia && !iaTrace) {
      iaTrace = await lanceurIA(c);
      c.rapport.fait(`Ouvre « Avec ton IA » PENDANT la partie, copie le prompt (${iaTrace.targetId}).`);
      if (o.ia === 'abandon') {
        await c.aller('/');
        c.rapport.fait('Quitte la partie sans la finir : elle a continué avec son IA, dehors.');
        return { abandon: true, ligne, trace: iaTrace };
      }
    }
    if (o.interrompre === 'laufend' && !interrompu) {
      interrompu = true;
      const avant = await echantillon(c);
      await c.page.reload();
      await until(c.page, () => /Finir l/.test(document.body.innerText), 'reprise du runner');
      const apres = await echantillon(c);
      c.rapport.fait('Recharge l\'onglet en pleine partie (une coupure, un clic malheureux).');
      await c.verifie('D10', 'une partie interrompue se reprend à l\'identique (même partie, même étape, chrono qui ne recule pas)', () => {
        const ok = !!avant && !!apres && apres.id === avant.id && apres.z === avant.z && apres.teil === avant.teil
          && Object.entries(avant.sek).every(([t, s]) => (apres.sek[t] ?? 0) >= s);
        return { ok, detail: `avant ${JSON.stringify(avant)} → après ${JSON.stringify(apres)}` };
      });
      await noter();
    }
    await btn(c.page, /^Finir /).click();
    await until(c.page, () => /Terminer ici/.test(document.body.innerText), 'bilan');   // [S4-3] §10.2.3
    await noter();
    const dejaAffiche = await present(c.page, /^Finir /);
    await c.verifie('D7', 'la fin de partie ne ramène jamais l\'exercice qu\'on vient de terminer', () => ({ ok: !dejaAffiche, detail: dejaAffiche ? '« Finir … » est de nouveau proposé dans le bilan' : 'le bilan s\'affiche, l\'exercice n\'est pas ré-ouvert' }));
    nParties++;
    const { k, n } = await tickBoxes(c, o.qualite ?? 0.6);
    await sleep(300);
    teilsJoues.push((await echantillon(c))?.teil);

    if (o.interrompre === 'bilan' && !o.interrompuBilan) {
      o.interrompuBilan = true;
      const avantDom = await c.page.evaluate(() => [...document.querySelectorAll('main input[type=checkbox]')].filter((x) => x.checked).length);
      const avant = await echantillon(c);
      await c.page.reload();
      await until(c.page, () => /Terminer ici|Finir l/.test(document.body.innerText), 'reprise au bilan');
      const apresDom = await c.page.evaluate(() => [...document.querySelectorAll('main input[type=checkbox]')].filter((x) => x.checked).length);
      const apres = await echantillon(c);
      c.rapport.fait(`Recharge l'onglet au BILAN, après avoir coché ${k}/${n} critères.`);
      await c.verifie('D10', 'une partie interrompue se reprend à l\'identique (même partie, même étape, chrono qui ne recule pas)', () => ({
        ok: !!apres && apres.id === avant.id && apres.z === avant.z && apresDom === avantDom,
        detail: `critères cochés ${avantDom} → ${apresDom} ; étape ${avant.z} → ${apres?.z}`,
      }));
      await noter();
    }
    if (!o.unTeil && await present(c.page, /^Continuer — /)) { await btn(c.page, /^Continuer — /).click(); await sleep(500); await noter(); await until(c.page, () => /Finir l/.test(document.body.innerText), 'partie suivante'); continue; }
    break;
  }

  await btn(c.page, /Terminer ici/).click();
  await until(c.page, () => /Enregistrer la simulation/.test(document.body.innerText), 'checklist de fin');
  await noter();
  if (o.retourBilan) {
    await btn(c.page, /Revenir au bilan/).click(); await sleep(500); await noter(true);
    c.rapport.fait('Hésite : « ← Revenir au bilan » depuis la checklist de fin, puis y retourne.');
    await btn(c.page, /Terminer ici/).click();
    await until(c.page, () => /Enregistrer la simulation/.test(document.body.innerText), 'checklist de fin (2)');
    await noter();
  }
  const clics = o.doubleSave ? 'double-clique sur' : 'clique sur';
  const simsAvant = (await idb(c.page, 'simulations')).length;
  const teAvant = (await idb(c.page, 'training_events')).length;
  const evCompleted = async () => (await idb(c.page, 'progress_events')).filter((e) => e.type === 'simulation.completed').length;
  const evAvant = await evCompleted();
  if (o.doubleSave) await btn(c.page, /Enregistrer la simulation/).dblclick(); else await btn(c.page, /Enregistrer la simulation/).click();
  await until(c.page, () => /score moyen/.test(document.body.innerText), 'écran de résultat');
  await sleep(500);
  const seqFin = await echantillon(c);                         // `lauf.aktiv` doit avoir disparu
  const sims = await idb(c.page, 'simulations'), tes = await idb(c.page, 'training_events'), evApres = await evCompleted();
  const resultat = (await texte(c.page)).match(/score moyen (\d+)\s*%/)?.[1];
  c.grand.exercices++; c.grand.joursTravailles.add(c.jourIso); c.grand[nParties >= 3 ? 'completes' : 'parties']++;
  c.rapport.fait(`Joue ${o.libre ? 'LIBREMENT (hors du plan) ' : ''}« ${ligne.label} » (${ligne.cta || 'Lancer'}), ${nParties} partie(s)${o.unTeil ? ' — un seul Teil, puis s\'arrête' : ''}, ${k_(o)} ; ${clics} « Enregistrer la simulation ». Score moyen affiché : ${resultat ?? '?'} %.`);

  // INV-22 : une partie validée (même deux fois) = UN enregistrement.
  await c.verifie('D8', 'une partie validée deux fois produit un seul enregistrement', () => ({
    ok: sims.length === simsAvant + 1 && tes.length === teAvant + 1 && evApres === evAvant + 1,
    detail: `${o.doubleSave ? 'double clic' : 'un clic'} : simulations ${simsAvant} → ${sims.length}, journal ${teAvant} → ${tes.length}, événements de synchro ${evAvant} → ${evApres}`,
  }));
  // INV-20/21/28 : l'automate vu depuis la base de l'app.
  await c.verifie('D7', 'la fin de partie ne revient jamais à un état antérieur (automate du Lauf)', () => {
    const fautes = [];
    for (let s = 1; s < seq.length; s++) {
      const a = seq[s - 1], b = seq[s];
      if (!a || !b) continue;
      if (b.id !== a.id) { fautes.push(`partie différente à l'échantillon ${s}`); continue; }
      const recule = ORDRE[b.z] < ORDRE[a.z];
      const partieSuivante = a.z === 'bilanz' && b.z === 'laufend' && !a.joues.includes(b.teil);   // progression nommée
      if (recule && !partieSuivante && !retours.has(s)) fautes.push(`${a.z} → ${b.z} (échantillon ${s}) sans geste de la candidate`);
      for (const [t, v] of Object.entries(a.sek)) if ((b.sek[t] ?? 0) < v) fautes.push(`chrono ${t} : ${v}s → ${b.sek[t] ?? 0}s`);
      if (a.joues.some((t) => !b.joues.includes(t))) fautes.push('une partie jouée a disparu');
    }
    if (seqFin) fautes.push(`la partie reste active (${seqFin.z}) après l'enregistrement`);
    return { ok: !fautes.length, detail: fautes.length ? fautes.join(' ; ') : `${seq.length} états observés : ${seq.filter(Boolean).map((s) => s.z).join(' → ')} → enregistrée` };
  });

  // INV-1 généralisé : jouer ne fait pas grandir le jour.
  await c.aller('/programme');
  await until(c.page, () => /min prévues/.test(document.body.innerText), 'plan');
  const ap = { b: await barre(c.page), rs: await rows(c.page) };
  await c.verifie('D1', 'jouer une tâche n\'en fait pas apparaître une autre', () => ({
    ok: ap.b.total === av.b.total && ap.b.min === av.b.min && ap.b.done >= av.b.done,
    detail: `${av.b.done}/${av.b.total} · ${av.b.min} min → ${ap.b.done}/${ap.b.total} · ${ap.b.min} min`,
  }));
  // S4-2 (INV-51) : une tâche de cas est faite quand TOUT ce qu'elle porte a été joué — jamais par une partie d'un seul Teil,
  // et la ligne dit alors ce qui reste. Lu dans le DOM (la ligne) et dans les plans que l'app a écrits.
  if (tache && (tache.kind === 'simulation' || tache.kind === 'revision')) {
    const teile = tache.teile ?? (tache.teil ? [tache.teil] : ['anamnese', 'dokumentation', 'fallvorstellung']);
    // Ce qui a été joué de ce cas depuis la création de la tâche, toutes parties confondues (le journal que l'app a écrit).
    const depuis = tache.creeA ?? new Date(`${c.jourIso}T00:00:00`).getTime();
    const joues = new Set(tes.filter((e) => e.caseId === tache.caseId && e.at >= depuis && e.scores).flatMap((e) => e.teile));
    const toutJoue = teile.every((t) => joues.has(t));
    const r = ap.rs.find((x) => x.label === tache.label);
    const texteLigne = await c.page.locator(ROW).filter({ hasText: tache.label }).first().innerText().catch(() => '');
    await c.verifie('D15', 'une tâche de cas se coche quand tout ce qu\'elle porte est joué — une partie d\'un seul Teil ne la coche pas, la ligne dit le reste', () => ({
      ok: !!r && r.fait === toutJoue && (toutJoue || !tache.teile || /Il te reste/.test(texteLigne)),
      detail: `tâche « ${tache.label} » (${teile.join(', ')}) ; joué : ${[...joues].join(', ') || 'rien'} ; ligne ${r?.fait ? 'faite' : 'non faite'}${!toutJoue ? ` : « ${texteLigne.split('\n').find((l) => /Il te reste/.test(l)) ?? 'aucun reste affiché'} »` : ''}`,
    }));
  }

  if (o.ia === 'pendant') {
    await c.aller('/');
    await sleep(1500);
    const carte = /Tu as simulé/.test(await texte(c.page));
    c.rapport.vu(carte ? 'À l\'accueil : la carte « Tu as simulé… » est REVENUE alors que la partie a été jouée et évaluée dans l\'app.' : 'À l\'accueil : aucune carte « Tu as simulé… » — l\'app sait que la partie a été jouée ici.');
    await c.verifie('D9', 'une partie jouée et évaluée dans l\'app n\'est jamais redemandée en évaluation à l\'accueil (lanceur IA ouvert pendant la partie)', () => ({ ok: !carte, detail: carte ? 'la carte « Tu as simulé… avec ' + iaTrace.targetId + ' » est affichée' : 'carte absente' }));
  }
  return { ligne, resultat, sim: sims[sims.length - 1], score: resultat };
}
const k_ = (o) => [o.qualite !== undefined ? `critères cochés à ~${Math.round(o.qualite * 100)} %` : '', o.interrompre ? `interrompue (${o.interrompre})` : '', o.ia ? `lanceur IA ouvert (${o.ia})` : ''].filter(Boolean).join(', ') || 'sans incident';

/** Témoin de D9 : la carte SAIT apparaître quand rien n'a été joué dans l'app, et se ferme. */
export async function carteRetourIA(c, trace) {
  await c.aller('/');
  await sleep(1500);
  const visible = /Tu as simulé/.test(await texte(c.page));
  c.rapport.vu(visible ? 'À l\'accueil : « Tu as simulé… avec ton IA — comment ça s\'est passé ? » (Évaluer · Pas maintenant · Ce n\'était pas une simulation).' : 'À l\'accueil : AUCUNE carte de retour alors que la candidate a joué dehors.');
  await c.verifie('D9t', 'témoin : la carte de retour apparaît quand la séance a eu lieu hors de l\'app', () => ({ ok: visible, detail: visible ? 'carte présente' : 'carte absente alors que le lanceur a été ouvert et rien n\'a été joué dans l\'app' }));
  if (visible) {
    await btn(c.page, /Ce n'était pas une simulation/).click();
    await sleep(600);
    c.rapport.fait('« Ce n\'était pas une simulation » : elle écarte la carte.');
    await c.verifie('D9t', 'témoin : « Ce n\'était pas une simulation » ferme la carte pour de bon', async () => {
      await c.page.reload(); await sleep(1200);
      return { ok: !/Tu as simulé/.test(await texte(c.page)) && !(await meta(c.page, 'externalAi.pending')), detail: 'carte et trace effacées' };
    });
  }
}

/** L'état de l'accueil à l'ouverture : hero, barre, points faibles — avec D2, D3. */
export async function accueil(c) {
  await c.aller('/');
  await until(c.page, () => /Session du jour|Crée ton programme|Journée terminée|Jour off|pas encore figée/.test(document.body.innerText), 'accueil');
  const h = await hero(c.page);
  const rs = await rows(c.page);
  const b = rs.length ? { done: rs.filter((r) => r.fait).length, total: rs.length } : null;
  const premiere = rs.find((r) => !r.fait);
  const txt = await texte(c.page);
  c.rapport.vu(h ? `Accueil — session du jour : « ${h} » (${premiere?.pourquoi ?? ''}), plan ${b.done}/${b.total}.` : /Journée terminée/.test(txt) ? 'Accueil — « Journée terminée. »' : /Jour off/.test(txt) ? 'Accueil — « Jour off — récupère bien. »' : 'Accueil — aucune session du jour.');
  const motif = premiere?.pourquoi ?? '';
  if (/\b0 terme dû/.test(motif) && h === premiere?.label) c.rapport.observation('la « session du jour » proposée est une révision de Fachbegriffe qui annonce « 0 terme dû aujourd\'hui » : la première chose offerte au matin est une tâche sans objet.');
  if (/\bdûs\b/.test(txt)) c.rapport.observation('orthographe : « termes dûs » à l\'écran — l\'accord correct est « dus » (lib/program/dayPlan.ts, raison de la tâche Fachbegriffe).');
  // La série : « jours de suite » = jours consécutifs TRAVAILLÉS, calculés depuis le registre de la candidate.
  const serie = Number(txt.match(/(\d+)\s*jours? de suite/)?.[1]);
  const veille = new Date(`${c.jourIso}T12:00:00`);
  const jourKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (!c.grand.joursTravailles.has(c.jourIso)) veille.setDate(veille.getDate() - 1);
  let attendue = 0;
  while (c.grand.joursTravailles.has(jourKey(veille))) { attendue++; veille.setDate(veille.getDate() - 1); }
  await c.verifie('D14', 'la série « jours de suite » est le nombre de jours consécutifs réellement travaillés', () => ({ ok: serie === attendue, detail: `affichée ${serie}, attendue ${attendue} (jours travaillés : ${[...c.grand.joursTravailles].join(', ')})` }));
  const lundi = new Date(`${c.jourIso}T12:00:00`).getDay() === 1;
  const vendredi = new Date(`${c.jourIso}T12:00:00`); vendredi.setDate(vendredi.getDate() - 3);
  if (lundi && serie === 0 && c.grand.joursTravailles.has(jourKey(vendredi)))
    c.rapport.observation('la série « jours de suite » retombe à 0 chaque lundi matin pour une candidate qui a travaillé tous ses jours ouvrés : les jours off du programme (samedi, dimanche) ne sont pas neutralisés (lib/stats.ts streakFromDays).');
  const tuile = Number(txt.match(/Tout ce que j'ai fait\s*(\d+)/)?.[1]);
  await c.verifie('D5', 'tout exercice (plan ou libre) apparaît dans l\'historique et dans les stats', () => ({
    ok: tuile === c.grand.exercices,
    detail: `tuile « Tout ce que j'ai fait » de l'accueil : ${tuile} ; la candidate a fait ${c.grand.exercices} exercice(s)`,
  }));
  await c.verifie('D2', 'la session du jour est la première tâche non faite du plan (accueil = programme)', async () => {
    if (!rs.length) return { ok: !h, detail: 'pas de plan, pas de session' };
    if (!premiere) return { ok: !h && /Journée terminée/.test(txt), detail: 'plan fini : « Journée terminée »' };
    return { ok: h === premiere.label, detail: `hero « ${h} » / première tâche non faite « ${premiere.label} »` };
  });
  // D3 : chaque « point faible » affiché a été MESURÉ sous le seuil — jamais un cas jamais joué.
  const faibles = await c.page.evaluate(() => [...(([...document.querySelectorAll('section')].find((x) => x.querySelector('h3')?.textContent.trim() === 'Points faibles')) ?? document.createElement('div')).querySelectorAll('a[href*="/pre?teil="]')].map((a) => ({
    // Identité par le lien (stable), jamais par une classe de style : C6-B a retiré `.truncate`.
    id: a.getAttribute('href').match(/\/simulation\/([^/]+)\/pre/)?.[1], teil: a.getAttribute('href').match(/teil=(\w+)/)?.[1],
    score: Number((a.querySelector('.mono-tag')?.textContent ?? '').replace(/\D/g, '')),
  })));
  const [cases, cps] = [await idb(c.page, 'cases'), await idb(c.page, 'case_progress')];
  await c.verifie('D3', 'aucun cas n\'est affiché « point faible » sans avoir été tenté et raté', () => {
    const fautes = faibles.filter((f) => {
      const cas = cases.find((x) => x.id === f.id);
      const t = cps.find((p) => p.caseId === cas?.id)?.teile?.[f.teil];
      return !t || t.attempts < 1 || t.status !== 'fragile' || t.lastScore !== f.score;
    });
    return { ok: !fautes.length, detail: fautes.length ? `affichés sans essai mesuré : ${fautes.map((f) => `${f.id}/${f.teil}`).join(', ')}` : `${faibles.length} point(s) faible(s) affiché(s), tous mesurés` };
  });
  if (faibles.length) c.rapport.vu(`Points faibles affichés : ${faibles.map((f) => `${cases.find((x) => x.id === f.id)?.name ?? f.id} (${f.teil}, ${f.score} %)`).join(' ; ')}.`);
  return { h, rs, txt };
}

/** Programme à l'ouverture : D4 (spécialités), D6 (rechargement), rattrapage. */
export async function programmeDuMatin(c, jourIso) {
  const m = await c.mesurePlan('matin');
  const plan = m.plans.find((p) => p.date === jourIso);
  c.rapport.vu(m.b ? `Programme — ${m.b.done}/${m.b.total} faits · ${m.b.min} min prévues ; mode « ${plan?.mode ?? '?'} » ; ${m.rs.map((r) => r.label).join(' · ')}.` : `Programme — ${/Jour off|Rien/.test(await texte(c.page)) ? 'pas de tâche' : 'pas de plan'}.`);
  if (plan?.mode === 'teil-first') {
    await c.verifie('D4', 'deux spécialités identiques ne se suivent jamais dans un plan', () => {
      const sp = plan.tasks.filter((t) => t.specialty);
      const fautes = [];
      for (let i = 1; i < sp.length; i++) if (sp[i].specialty === sp[i - 1].specialty && sp[i].diversityRelaxed !== true) fautes.push(`${sp[i - 1].label} → ${sp[i].label} (${sp[i].specialty})`);
      return { ok: !fautes.length, detail: fautes.length ? fautes.join(' ; ') : `${sp.length} tâches : ${sp.map((t) => t.specialty).join(' → ')}${sp.some((t) => t.diversityRelaxed) ? ' (pool épuisé : relâchement tracé)' : ''}` };
    });
  }
  // D6 : rechargé, le jour est LE MÊME — pas seulement « pareil » : mêmes identifiants, même graine, même instant de
  // matérialisation (un plan recalculé à chaque ouverture ressemble au précédent mais n'en est plus le même).
  const ident = (plans) => JSON.stringify(plans.filter((p) => p.date === jourIso).map((p) => ({ s: p.seed, at: p.materializedAt, ids: p.tasks.map((t) => t.id) })));
  await c.page.reload(); await sleep(900);
  const m2 = await c.mesurePlan('rechargé');
  await c.verifie('D6', 'un jour figé est identique à sa matérialisation, plus tard comme après rechargement', () => ({
    ok: !!m.b && !!m2.b && m2.b.total === m.b.total && m2.b.min === m.b.min && ident(m.plans) === ident(m2.plans)
      && JSON.stringify(m.rs.map((r) => r.label)) === JSON.stringify(m2.rs.map((r) => r.label)),
    detail: m.b && m2.b ? `${m.b.total} tâches / ${m.b.min} min avant, ${m2.b.total} / ${m2.b.min} après rechargement ; ${ident(m.plans) === ident(m2.plans) ? 'mêmes identifiants et même graine' : 'IDENTIFIANTS OU GRAINE CHANGÉS'}` : 'plan absent',
  }));
  return m;
}
