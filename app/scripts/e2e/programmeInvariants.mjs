#!/usr/bin/env node
// ============================================================================
// Les quatre preuves navigateur du programme figé — série 3, chantier C1.
// Contrat : docs/contracts/training-journal.md · ADR-0017 · ADR-0020.
//
// Rejouable, pas une manipulation ponctuelle : ce script ARRANGE l'état par
// l'interface de l'app (il remplit le formulaire, il clique), puis MESURE.
//
// Règle de mesure, opposable (CLAUDE.md) : tout se lit depuis l'app elle-même —
// le DOM rendu, et la base IndexedDB que l'app a écrite, par l'API native.
// Aucune sonde ne fait `import('/src/…')` : ce serait une SECONDE instance de
// module, qui recalculerait sa propre réponse au lieu d'observer celle de
// l'app. Les seuls endroits sans rendu (spécialité d'une tâche, statut par
// Teil) se lisent dans les object stores que l'app a remplis, jamais recalculés.
//
// Usage :
//   node scripts/e2e/programmeInvariants.mjs            # démarre son vite
//   node scripts/e2e/programmeInvariants.mjs --port 5183 --no-server
//
// Sortie : code 0 si les quatre preuves passent, 1 sinon. Le code de sortie est
// le verdict — jamais la lecture d'un message.
// ============================================================================
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import process from 'node:process';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const PORT = Number(arg('--port', 5183));
const OWN_SERVER = !argv.includes('--no-server');
const BASE = `http://localhost:${PORT}`;
const SESSION = arg('--session', 'prog-inv');

// --- pilotage ---------------------------------------------------------------

function pw(...args) {
  const r = spawnSync('playwright-cli', ['-s', SESSION, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`playwright-cli ${args[0]} → ${r.status}\n${r.stdout ?? ''}${r.stderr ?? ''}`);
  return r.stdout ?? '';
}

/** Prélude injecté dans la page : lecture NATIVE des object stores de l'app. */
const PRELUDE = `
  const _names = (await indexedDB.databases()).map((d) => d.name);
  const _dbName = _names.find((n) => n && n.startsWith('fsp-cockpit'));
  const read = (store) => new Promise((res, rej) => {
    const rq = indexedDB.open(_dbName);
    rq.onerror = () => rej(rq.error);
    rq.onsuccess = () => {
      const d = rq.result;
      const g = d.transaction(store, 'readonly').objectStore(store).getAll();
      g.onsuccess = () => { res(g.result); d.close(); };
      g.onerror = () => rej(g.error);
    };
  });
  const txt = () => document.body.innerText;
  /** La barre du jour telle qu'elle est RENDUE : « 3/7 faits · 119 min prévues ». */
  const barre = () => {
    const m = txt().match(/(\\d+)\\/(\\d+) faits? · (\\d+) min prévues/);
    return m ? { done: +m[1], total: +m[2], min: +m[3] } : null;
  };
  /** Les lignes de tâche rendues, dans l'ordre du DOM. */
  const lignes = () => [...document.querySelectorAll('div.rounded-xl.border.transition-colors')]
    .map((r) => ({
      label: (r.querySelector('.font-medium')?.textContent ?? '').trim(),
      fait: !r.querySelector('[title="Marquer faite"]'),
    }));
  const bouton = (pred) => [...document.querySelectorAll('button,a')].find((b) => pred((b.textContent ?? '').trim()));
  const attendre = async (pred, ms = 8000) => {
    for (let i = 0; i * 100 < ms; i++) { if (pred()) return true; await new Promise((r) => setTimeout(r, 100)); }
    return false;
  };
`;

/** Évalue `src` DANS la page et renvoie sa valeur (JSON). */
function probe(src) {
  const out = pw('eval', `async () => { ${PRELUDE} return JSON.stringify(await (async () => { ${src} })()); }`, '--raw');
  const line = out.trim().split('\n').map((l) => l.trim()).filter(Boolean).pop();
  return JSON.parse(JSON.parse(line));
}

const goto = (hash) => { pw('goto', `${BASE}/#${hash}`); };

/** Attend, en rechargeant la mesure, qu'une condition soit vraie DANS la page. */
async function until(src, label, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const v = probe(src);
    if (v) return v;
    await sleep(500);
  }
  throw new Error(`timeout: ${label}`);
}

// --- verdict ----------------------------------------------------------------

const resultats = [];
function preuve(id, titre, fn) {
  return async () => {
    try {
      const detail = await fn();
      resultats.push({ id, titre, ok: true, detail });
      console.log(`PASS  ${id} — ${titre}\n      ${detail}`);
    } catch (e) {
      resultats.push({ id, titre, ok: false, detail: e.message });
      console.log(`FAIL  ${id} — ${titre}\n      ${e.message}`);
    }
  };
}
const exige = (cond, msg) => { if (!cond) throw new Error(msg); };
const memeMultiensemble = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// --- arrangement ------------------------------------------------------------

/** Les stores que l'arrangement remet à zéro. Le CONTENU (cases, Fachbegriffe,
 *  fiches) n'y est pas : il vient du réseau au premier chargement seulement, et
 *  le rejouer à chaque exécution ferait dépendre la preuve d'un service tiers. */
const STORES_A_VIDER = ['progress_events', 'outbox', 'training_events', 'day_plans', 'case_progress', 'simulations'];

/** Remet la progression à neuf, crée un programme, et FIGE le jour. */
async function arranger() {
  for (let i = 0; i < 3; i++) {
    try { pw('open', BASE); pw('eval', '() => location.href', '--raw'); break; }
    catch (e) { if (i === 2) throw e; await sleep(2000); }
  }
  goto('/programme');
  const pret = await until(`
    if (txt().includes("besoin d'une connexion")) return 'PREMIER_CHARGEMENT';
    return txt().includes('Aucun programme encore') || txt().includes('min prévues') || txt().includes('figé à sa première ouverture')
      ? 'OK' : null;
  `, 'app chargée');
  exige(pret === 'OK',
    `l'app n'a jamais chargé son contenu dans ce navigateur. Prérequis : un Supabase joignable UNE fois `
    + `(VITE_SUPABASE_URL de app/.env). Ensuite le contenu reste en IndexedDB et ce script n'a plus besoin du réseau.`);

  // Remise à zéro de la seule PROGRESSION, par l'API IndexedDB native — la même
  // base que l'app vient d'écrire, jamais une seconde instance de module.
  probe(`
    for (const s of ${JSON.stringify(STORES_A_VIDER)}) {
      await new Promise((res, rej) => {
        const rq = indexedDB.open(_dbName);
        rq.onsuccess = () => { const d = rq.result;
          if (!d.objectStoreNames.contains(s)) { d.close(); return res(); }
          const tx = d.transaction(s, 'readwrite');
          tx.objectStore(s).clear();
          tx.oncomplete = () => { d.close(); res(); };
          tx.onerror = () => { d.close(); rej(tx.error); }; };
        rq.onerror = () => rej(rq.error);
      });
    }
    await new Promise((res, rej) => {
      const rq = indexedDB.open(_dbName);
      rq.onsuccess = () => { const d = rq.result;
        const tx = d.transaction('meta', 'readwrite');
        tx.objectStore('meta').delete('program');
        tx.oncomplete = () => { d.close(); res(); };
        tx.onerror = () => { d.close(); rej(tx.error); }; };
      rq.onerror = () => rej(rq.error);
    });
    return true;
  `);
  pw('reload');
  await until(`return txt().includes('Aucun programme encore') ? true : null;`, 'programme remis à zéro');

  if (probe(`return txt().includes('Aucun programme encore');`)) {
    probe(`bouton((t) => t === 'Générer mon programme').click(); return await attendre(() => !txt().includes('Aucun programme encore'));`);
  }
  // Le plan n'est matérialisé qu'au DÉMARRAGE de l'app (contrat §3.2) : la page
  // affiche « Ce jour sera figé à sa première ouverture » tant qu'on n'a pas
  // rechargé. C'est l'invariant, pas un contournement.
  pw('reload');
  return await until(`return barre();`, 'plan du jour matérialisé');
}

const planDuJour = () => probe(`
  const plans = await read('day_plans');
  const today = plans.sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return today ? { date: today.date, mode: today.mode, targetMin: today.targetMin, tasks: today.tasks } : null;
`);

// --- les preuves ------------------------------------------------------------

const P4 = preuve('P4', `deux spécialités identiques ne se suivent jamais dans un plan généré`, async () => {
  const plan = planDuJour();
  exige(plan, 'aucun plan figé');
  exige(plan.mode === 'teil-first', `mode ${plan.mode} : la diversité n'est une contrainte dure qu'en teil-first (select.ts:127)`);
  const picks = plan.tasks.filter((t) => (t.kind === 'simulation' || t.kind === 'examen-blanc') && t.specialty);
  exige(picks.length >= 2, `${picks.length} tâche(s) sélectionnée(s) : la contrainte d'adjacence ne se mesure pas`);
  const fautes = [];
  for (let i = 1; i < picks.length; i++) {
    if (picks[i].specialty === picks[i - 1].specialty && picks[i].diversityRelaxed !== true) {
      fautes.push(`${i - 1}/${i} = ${picks[i].specialty}`);
    }
  }
  exige(!fautes.length, `adjacence violée sans relâchement tracé : ${fautes.join(', ')}`);
  return `${picks.length} sélections, suite = ${picks.map((t) => t.specialty).join(' → ')}`;
});

const P2 = preuve('P2', "la session du jour appartient au plan du jour", async () => {
  goto('/');
  const hero = await until(`
    const eyebrow = [...document.querySelectorAll('div')]
      .find((e) => e.children.length <= 1 && (e.textContent || '').trim().startsWith('Session du jour'));
    const h2 = eyebrow && eyebrow.parentElement.querySelector('h2');
    return h2 ? h2.textContent.trim() : null;
  `, 'hero de la session du jour');

  goto('/programme');
  const vue = await until(`const l = lignes(); return l.length ? l : null;`, 'lignes du plan');
  const premiereNonFaite = vue.find((l) => !l.fait);
  exige(premiereNonFaite, 'aucune tâche non faite : la preuve ne se mesure pas');
  exige(hero === premiereNonFaite.label, `hero « ${hero} » ≠ première tâche non faite « ${premiereNonFaite.label} »`);

  // …et cette tâche est bien DANS le plan figé, à la place que `sessionDuJour` désigne.
  const plan = planDuJour();
  const attendue = plan.tasks.find((t) => t.doneAt === undefined);
  exige(attendue, 'plan sans tâche restante');
  exige(attendue.label === hero, `plan figé → « ${attendue.label} », écran → « ${hero} »`);
  return `accueil et programme lisent la même tâche : « ${hero} »`;
});

const P1 = preuve('P1', "cocher une tâche n'en fait pas apparaître une autre", async () => {
  goto('/programme');
  const av = await until(`const b = barre(); return b ? { barre: b, lignes: lignes() } : null;`, 'plan rendu');
  const cible = av.lignes.findIndex((l) => !l.fait && l.label !== 'Fachbegriffe');
  exige(cible >= 0, 'aucune tâche non faite hors drill');

  const ap = probe(`
    const rows = [...document.querySelectorAll('div.rounded-xl.border.transition-colors')];
    rows[${cible}].querySelector('[title="Marquer faite"]').click();
    await attendre(() => (barre() || {}).done === ${av.barre.done + 1});
    return { barre: barre(), lignes: lignes() };
  `);
  exige(ap.barre.done === av.barre.done + 1, `coche non enregistrée (${JSON.stringify(ap.barre)})`);
  exige(ap.barre.total === av.barre.total, `le nombre de tâches a bougé : ${av.barre.total} → ${ap.barre.total}`);
  exige(ap.barre.min === av.barre.min, `le budget a bougé : ${av.barre.min} → ${ap.barre.min} min`);
  exige(memeMultiensemble(av.lignes.map((l) => l.label), ap.lignes.map((l) => l.label)), 'les sujets du jour ont changé');

  // Et le jour reste figé au redémarrage de l'app, là où `ensureDayPlan` repasse.
  pw('reload');
  const rl = await until(`const b = barre(); return b ? { barre: b, lignes: lignes() } : null;`, 'plan après rechargement');
  exige(rl.barre.total === av.barre.total && rl.barre.min === av.barre.min,
    `au redémarrage le plan a changé : ${JSON.stringify(rl.barre)} ≠ ${JSON.stringify(av.barre)}`);
  exige(memeMultiensemble(av.lignes.map((l) => l.label), rl.lignes.map((l) => l.label)), 'les sujets ont changé au redémarrage');
  return `${av.barre.total} tâches / ${av.barre.min} min avant, pendant et après redémarrage ; faits ${av.barre.done} → ${ap.barre.done}`;
});

const P1b = preuve('P1b', "faire son drill ne libère aucun budget qui attirerait des simulations", async () => {
  goto('/programme');
  const av = await until(`const b = barre(); return b ? { barre: b, lignes: lignes() } : null;`, 'plan rendu');
  const i = av.lignes.findIndex((l) => l.label === 'Fachbegriffe' && !l.fait);
  exige(i >= 0, 'pas de tâche de drill non faite : la preuve ne se mesure pas');
  const simsAvant = planDuJour().tasks.filter((t) => t.kind === 'simulation').length;

  probe(`
    const rows = [...document.querySelectorAll('div.rounded-xl.border.transition-colors')];
    rows[${i}].querySelector('[title="Marquer faite"]').click();
    await attendre(() => (barre() || {}).done === ${av.barre.done + 1});
    return true;
  `);
  pw('reload');                                    // le seul endroit où le jour pourrait se re-matérialiser
  const ap = await until(`const b = barre(); return b ? { barre: b, lignes: lignes() } : null;`, 'plan après drill');
  const simsApres = planDuJour().tasks.filter((t) => t.kind === 'simulation').length;

  exige(ap.barre.total === av.barre.total, `le nombre de tâches a bougé : ${av.barre.total} → ${ap.barre.total}`);
  exige(ap.barre.min === av.barre.min, `le budget a bougé : ${av.barre.min} → ${ap.barre.min} min`);
  exige(simsApres === simsAvant, `des simulations sont apparues : ${simsAvant} → ${simsApres}`);
  return `drill coché, ${simsAvant} simulations avant et après, budget ${av.barre.min} min inchangé`;
});

const P3a = preuve('P3a', "travailler un seul Teil ne rend fautif aucun autre Teil", async () => {
  goto('/programme');
  const plan = planDuJour();
  const tache = plan.tasks.find((t) => t.kind === 'simulation' && t.teil && t.doneAt === undefined);
  exige(tache, 'aucune tâche de simulation non faite portée par un seul Teil');

  const i = probe(`return lignes().findIndex((l) => l.label === ${JSON.stringify(tache.label)});`);
  exige(i >= 0, `la tâche « ${tache.label} » n'est pas rendue`);
  probe(`
    const rows = [...document.querySelectorAll('div.rounded-xl.border.transition-colors')];
    rows[${i}].querySelector('[title="Marquer faite"]').click();
    return await attendre(() => lignes()[${i}].fait);
  `);
  const cp = await until(`
    return (await read('case_progress')).find((p) => p.caseId === '${tache.caseId}') || null;
  `, `case_progress de ${tache.caseId}`);

  const statuts = Object.fromEntries(Object.entries(cp.teile).map(([k, v]) => [k, v.status]));
  const fautifs = Object.entries(statuts).filter(([, s]) => s === 'fragile');
  exige(!fautifs.length, `sans performance mesurée, ${fautifs.map(([k]) => k).join(', ')} est déjà « fragile » — l'absence accuse`);
  for (const t of ['anamnese', 'dokumentation', 'fallvorstellung'].filter((t) => t !== tache.teil)) {
    exige(statuts[t] === 'vierge', `« ${t} » jamais travaillé mais vaut « ${statuts[t] }»`);
  }
  return `${tache.label} (${tache.teil}) : ${Object.entries(statuts).map(([k, v]) => `${k}=${v}`).join(', ')}, overall=${cp.overall}`;
});

const P3b = preuve('P3b', "une session réussie sur un seul Teil ne fait régresser aucun statut", async () => {
  goto('/programme');
  const plan = planDuJour();
  const tache = plan.tasks.find((t) => t.kind === 'simulation' && t.teil && t.doneAt === undefined)
    ?? plan.tasks.find((t) => t.kind === 'simulation' && t.teil);
  exige(tache, 'aucune tâche de simulation portée par un seul Teil');

  // Un run RÉEL, par l'interface : contenu 100 %, grille et ressenti aux
  // valeurs par défaut (3/5 et 50) ⇒ 55 + 18 + 7,5 = 81 % ⇒ `solide`.
  goto(`/simulation/${tache.caseId}/pre?teil=${tache.teil}`);
  await until(`return bouton((t) => t.startsWith('Entrer —')) ? true : null;`, 'écran pré-simulation');
  probe(`bouton((t) => t.startsWith('Entrer —')).click(); return await attendre(() => location.hash.includes('/run'));`);
  await until(`return bouton((t) => t.startsWith('Terminer la partie')) ? true : null;`, 'runner');
  probe(`bouton((t) => t.startsWith('Terminer la partie')).click(); return await attendre(() => !!bouton((t) => t.startsWith('Valider la partie')));`);
  const score = probe(`
    for (const c of document.querySelectorAll('input[type=checkbox]')) if (!c.checked) c.click();
    await attendre(() => false, 300);
    const pcts = [...txt().matchAll(/(\\d+)%/g)].map((m) => +m[1]);
    bouton((t) => t.startsWith('Valider la partie')).click();
    await attendre(() => !!bouton((t) => t.startsWith('Terminer — ')));
    return pcts;
  `);
  probe(`bouton((t) => t.startsWith('Terminer — ')).click(); return await attendre(() => txt().includes('score moyen'));`);

  const etat = await until(`
    const cp = (await read('case_progress')).find((p) => p.caseId === '${tache.caseId}');
    return cp ? { cp, te: (await read('training_events')).filter((t) => t.caseId === '${tache.caseId}') } : null;
  `, `case_progress de ${tache.caseId} (gate G-JOURNAL-SIM si absent : le journal local n'est pas alimenté par saveSimulation)`, 20);

  const { cp } = etat;
  const autres = ['anamnese', 'dokumentation', 'fallvorstellung'].filter((t) => t !== tache.teil);
  exige(!['vierge', 'fragile'].includes(cp.teile[tache.teil].status),
    `le Teil travaillé est « ${cp.teile[tache.teil].status} » alors que la session a réussi`);
  for (const t of autres) {
    exige(cp.teile[t].status === 'vierge',
      `« ${t} » n'a jamais été travaillé mais vaut « ${cp.teile[t].status} » — l'absence accuse`);
  }
  exige(cp.overall === 'entame', `overall « ${cp.overall} » : vierge → entame attendu, jamais une régression`);

  // Et l'écran ne l'accuse pas non plus : la cellule du champ de couverture
  // d'un Teil jamais travaillé reste « pas encore travaillé ».
  goto('/programme');
  const cellules = await until(`
    const t = [...document.querySelectorAll('button[title]')].filter((b) => b.title.includes('pas encore travaillé'));
    return t.length ? t.map((b) => b.title) : null;
  `, 'champ de couverture');
  const cible = cellules.filter((t) => t.startsWith(`${tache.specialty} ×`));
  exige(cible.length >= autres.length,
    `champ de couverture : ${cible.length} cellule(s) « pas encore travaillé » pour ${tache.specialty}, ${autres.length} attendues`);
  return `${tache.label} (${tache.teil}) → ${score.join('/')} % ; ${tache.teil}=${cp.teile[tache.teil].status}, ${autres.map((t) => `${t}=${cp.teile[t].status}`).join(', ')}, overall=${cp.overall}`;
});

// --- exécution --------------------------------------------------------------

let serveur = null;
async function attendreServeur() {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(BASE, { signal: AbortSignal.timeout(2000) }); if (r.ok) return; } catch { /* pas encore */ }
    await sleep(1000);
  }
  throw new Error(`serveur injoignable sur ${BASE}`);
}

/**
 * Un 200 ne dit PAS que le serveur sert CE worktree : `node_modules` est un
 * lien partagé entre worktrees, et plusieurs serveurs répondent 200 sur la même
 * machine. On demande un module source et on y cherche un symbole que seule
 * cette branche porte.
 */
async function verifierWorktree() {
  const res = await fetch(`${BASE}/src/lib/journal.ts`, { signal: AbortSignal.timeout(90_000) });
  const src = res.ok ? await res.text() : '';
  exige(src.includes('applySimulationToJournal'),
    `le serveur de ${BASE} ne sert pas ce worktree (symbole 'applySimulationToJournal' absent de src/lib/journal.ts)`);
}

try {
  if (OWN_SERVER) {
    serveur = spawn('npm', ['run', 'dev', '--', '--port', String(PORT), '--strictPort'],
      { cwd: new URL('../..', import.meta.url).pathname, stdio: 'ignore', detached: true });
  }
  await attendreServeur();
  await verifierWorktree();

  const barre0 = await arranger();
  console.log(`\nÉtat figé : ${barre0.total} tâches, ${barre0.min} min prévues.\n`);

  // L'ordre est porteur : les lectures pures d'abord, les gestes ensuite —
  // P2 lit la PREMIÈRE tâche non faite, elle doit passer avant qu'on ne coche.
  await P4();
  await P2();
  await P1();
  await P1b();
  await P3a();
  await P3b();
} catch (e) {
  resultats.push({ id: 'ARRANGEMENT', titre: 'mise en place', ok: false, detail: e.message });
  console.log(`FAIL  ARRANGEMENT — ${e.message}`);
} finally {
  if (serveur) { try { process.kill(-serveur.pid); } catch { /* déjà mort */ } }
}

const rates = resultats.filter((r) => !r.ok);
console.log(`\n${resultats.length - rates.length}/${resultats.length} preuves passées.`);
process.exit(rates.length ? 1 : 0);
