#!/usr/bin/env node
// ============================================================================
// Preuve par mutation des invariants C6 — « un test qui ne rougit jamais ne
// garde rien ». Pour CHAQUE invariant, une mutation du code applicatif qui
// réintroduit le défaut qu'il garde ; l'invariant doit alors ÉCHOUER.
//
// Tout se passe sur une COPIE (tmp) : ni `src/` ni le dépôt ne sont touchés.
// Le baseline (copie intacte) doit passer, sinon « rouge » ne prouverait rien
// (un environnement cassé rougit aussi).
//
// Usage :  node scripts/parcours-mutations.mjs [--only INV-1,INV-4] [--keep]
//          node scripts/parcours-mutations.mjs --navigateur --env-file <.env local> [--only D1,D9]
//            → la même preuve pour le CANDIDAT SYNTHÉTIQUE : le défaut est réintroduit dans
//              une copie, l'app est reconstruite, la candidate rejoue — elle doit sortir KO
//              sur l'invariant attendu (~10 min ; manuel, jamais en CI).
// Sortie : code 0 si le baseline est vert ET toute mutation est tuée ; 1 sinon.
// ============================================================================
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const only = (argv.includes('--only') ? argv[argv.indexOf('--only') + 1].split(',') : null);
const keep = argv.includes('--keep');

/** { id, tests: fichier(s) de tests, file: source mutée, from → to (exactement 1 occurrence), pourquoi } */
export const MUTATIONS = [
  {
    id: 'INV-1', tests: 'tests/invariants.programme.test.ts', file: 'src/lib/journal.ts',
    from: 'await db.day_plans.put({ ...plan, tasks });',
    to: "await db.day_plans.put({ ...plan, tasks: [...tasks, { ...tasks[0], id: `${tasks[0].id}-bis`, doneAt: undefined, eventId: undefined }] });",
    pourquoi: 'cocher fait apparaître une tâche de plus (le défaut historique du plan recalculé)',
  },
  {
    id: 'INV-2', tests: 'tests/invariants.programme.test.ts', file: 'src/lib/program/dayPlan.ts',
    from: 'plan?.tasks.find((t) => t.doneAt === undefined) ?? null;',
    to: 'plan?.tasks.find((t) => t.doneAt === undefined) ?? plan?.tasks[plan.tasks.length - 1] ?? null;',
    pourquoi: 'plan fini : la session du jour redevient une tâche déjà faite',
  },
  {
    id: 'INV-4', tests: 'tests/invariants.programme.test.ts', file: 'src/lib/program/select.ts',
    from: 'picked.length === 0 || picked[picked.length - 1] !== next;',
    to: 'true;',
    pourquoi: 'la diversité redevient un souhait : deux spécialités identiques se suivent',
  },
  {
    id: 'INV-3a', tests: 'tests/invariants.journal.test.tsx', file: 'src/lib/journal.ts',
    from: "cp?.teile[teil].status === 'fragile';",
    to: "cp?.teile[teil].status === 'fragile' || cp?.teile[teil].status === 'vierge';",
    pourquoi: 'un Teil jamais travaillé redevient un point faible (le classement « par absence » de l’audit §5)',
  },
  {
    id: 'INV-3b', tests: 'tests/invariants.journal.test.tsx', file: 'src/lib/stats.ts',
    from: "if (p.status === 'fragile' && p.lastScore !== null) out.push",
    to: "if (p.status !== 'solide') out.push",
    pourquoi: 'la liste « Points faibles » affichée accuse les cas jamais joués',
  },
  {
    id: 'INV-5a', tests: 'tests/invariants.journal.test.tsx', file: 'src/lib/journal.ts',
    from: '  await db.training_events.put(event);\n  await applyEventToLocalState(event);\n  return event;',
    to: "  if (event.source !== 'libre') await db.training_events.put(event);\n  await applyEventToLocalState(event);\n  return event;",
    pourquoi: 'un exercice libre n’entre plus dans le journal : ni historique ni stats',
  },
  {
    id: 'INV-5b', tests: 'tests/invariants.journal.test.tsx', file: 'src/lib/journal.ts',
    from: 'new Set(trainingEvents.map((te) => dayKey(te.at)));',
    to: "new Set(trainingEvents.filter((te) => te.kind === 'simulation').map((te) => dayKey(te.at)));",
    pourquoi: 'INV-6 : une journée 100 % drill n’est plus une journée travaillée (program.ts:320-327)',
  },
  {
    id: 'INV-5c', tests: 'tests/invariants.journal.test.tsx', file: 'src/lib/journal.ts',
    from: 'for (const te of trainingEvents) { const k = dayKey(te.at); m.set(',
    to: "for (const te of trainingEvents) { if (te.source === 'libre') continue; const k = dayKey(te.at); m.set(",
    pourquoi: 'le temps investi ignore les exercices libres',
  },
  {
    id: 'INV-5d', tests: 'tests/invariants.journal.test.tsx', file: 'src/features/program/HistoriquePage.tsx',
    from: '  const filtered = useMemo(() => (events ?? []).filter((e) => {\n',
    to: "  const filtered = useMemo(() => (events ?? []).filter((e) => {\n    if (e.source === 'libre') return false;\n",
    pourquoi: 'l’écran Historique masque les exercices hors plan',
  },
  {
    id: 'INV-21', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "if (lauf.zustand !== 'laufend' || !lauf.aktuellerTeil) return lauf;\n      const t = lauf.aktuellerTeil;",
    to: "if (lauf.zustand !== 'laufend' || !lauf.aktuellerTeil || lauf.geplanteTeile.length === 1) return lauf;\n      const t = lauf.aktuellerTeil;",
    pourquoi: 'le dernier Teil (ou un Teil seul) ne mène plus nulle part : « Valider » ne fait rien (SimulationRunner.tsx:184-191)',
  },
  {
    id: 'INV-20a', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "if (lauf.zustand !== 'vorbereitung') return lauf;\n      const teil = aktion.teil",
    to: "if (lauf.zustand === 'gespeichert') return lauf;\n      const teil = aktion.teil",
    pourquoi: '« démarrer » redevient possible depuis le bilan : la fin de partie recule à laufend',
  },
  {
    id: 'INV-20b', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: 'lauf.geplanteTeile.find((t) => !lauf.teileGespielt.includes(t)) ?? null;',
    to: 'lauf.geplanteTeile[0] ?? null;',
    pourquoi: 'la partie suivante ré-affiche l’exercice qu’on vient de terminer',
  },
  {
    id: 'INV-20c', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "if (lauf.zustand !== 'checkliste') return lauf;\n      const letzter",
    to: "if (lauf.zustand !== 'checkliste' && lauf.zustand !== 'gespeichert') return lauf;\n      const letzter",
    pourquoi: 'une simulation enregistrée peut être rouverte au bilan',
  },
  {
    id: 'INV-28', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: 'if (sekunden <= vorher) return lauf;',
    to: 'if (sekunden === vorher) return lauf;',
    pourquoi: 'un chrono remis à zéro par un remontage écrase le temps joué (« on m’a remis au début »)',
  },
  {
    id: 'INV-22', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/simulationSave.ts',
    from: '  if (!nouveau) return sim;\n',
    to: '',
    pourquoi: 'une partie validée deux fois émet deux événements de synchro et de journal',
  },
  {
    id: 'FB3-3oct', tests: 'tests/invariants.ia-externe.test.tsx', file: 'src/features/simulation/PendingExternalSimCard.tsx',
    from: "    if (await db.simulations.where('caseId').equals(x.caseId).filter((s) => (s.date >= x.at || ecrites.has(s.id)) && couvre(s)).count()) return null;\n",
    to: '',
    pourquoi: 'le correctif dbf87df7 est retiré : l’accueil redemande l’évaluation d’une partie déjà jouée dans l’app',
  },
  {
    id: 'FB3-teil', tests: 'tests/invariants.ia-externe.test.tsx', file: 'src/features/simulation/PendingExternalSimCard.tsx',
    from: '.filter((s) => (s.date >= x.at || ecrites.has(s.id)) && couvre(s)).count()',
    to: '.filter((s) => (s.date >= x.at || ecrites.has(s.id))).count()',
    pourquoi: 'le correctif 0560198d est retiré : une partie d’un AUTRE Teil du même cas fait taire la séance externe',
  },
  {
    id: 'FB3-temoin', tests: 'tests/invariants.ia-externe.test.tsx', file: 'src/features/simulation/PendingExternalSimCard.tsx',
    from: '.filter((s) => (s.date >= x.at || ecrites.has(s.id)) && couvre(s)).count()',
    to: '.filter((s) => (s.date >= 0 || ecrites.has(s.id)) && couvre(s)).count()',
    pourquoi: 'la garde devient trop large : n’importe quelle partie passée du cas fait taire une vraie séance externe',
  },
  {
    id: 'FB3-debut-S4', tests: 'tests/invariants.ia-externe.test.tsx', file: 'src/features/simulation/PendingExternalSimCard.tsx',
    from: '.filter((s) => (s.date >= x.at || ecrites.has(s.id)) && couvre(s)).count()',
    to: '.filter((s) => s.date >= x.at && couvre(s)).count()',
    pourquoi: '[S4] `date` = début de la partie : une partie commencée AVANT le lancement IA et enregistrée après redemande son évaluation',
  },
  {
    id: 'INV-9', tests: 'tests/parcours14j.test.ts', file: 'src/lib/program/dayPlan.ts',
    from: '  if (existing) return existing;                                  // « figé » veut dire que le premier fige\n',
    to: '',
    pourquoi: 'le plan est de nouveau recalculé à chaque ouverture (le défaut d’origine de l’audit programme)',
  },
  {
    // S4-2 : la complétion est dérivée (deriverPlan) — le chemin incrémental (applyEventToLocalState) perd `eventId`.
    id: 'INV-10', tests: 'tests/parcours14j.test.ts', file: 'src/lib/journal.ts',
    from: 'await db.day_plans.put({ ...plan, tasks });',
    to: 'await db.day_plans.put({ ...plan, tasks: tasks.map(({ eventId: _e, ...t }) => t) });',
    pourquoi: 'la projection locale diverge de la reconstruction (état qui ne survit pas au redémarrage)',
  },
  {
    // S4-2 : `taperDays` vit dans calendrier.ts, sans horloge — la mutation l'apporte (un `import` est remonté au niveau module).
    id: 'INV-12', tests: 'tests/parcours14j.test.ts', file: 'src/lib/program/calendrier.ts',
    from: 'export function taperDays(config: ProgramConfig): Set<string> {\n  const start = startOfDay(parseISO(config.startDate));',
    to: "import { now as clockNow } from '@/lib/clock';\nexport function taperDays(config: ProgramConfig): Set<string> {\n  const start = startOfDay(new Date(clockNow()));",
    pourquoi: 'la fenêtre de dernière ligne droite se calcule sur les jours restants : elle glisse chaque jour (program.ts:35-37)',
  },
  {
    id: 'INV-23', tests: 'tests/parcours14j.test.ts', file: 'src/lib/lauf/speichern.ts',
    from: '  return restauriere(l);\n}',
    to: '  return { ...restauriere(l), sekundenProTeil: {} };\n}',
    pourquoi: 'une partie interrompue reprend avec le chrono remis à zéro',
  },
  // --- S4-1 : la mesure (training-journal.md §8.1, §8.2 ; décisions (b) et (e)) ---
  {
    id: "INV-53", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/progression.ts",
    from: "/ joues.length) : null;",
    to: "/ 3) : null;",
    pourquoi: "la maîtrise redevient Σ lastScore / 3 : un seul Teil joué à 90 affiche 30 (le défaut de simScope.ts:42)",
  },
  {
    id: "INV-61a", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/progression.ts",
    from: "return premiereReussiteAt !== null && differenceInCalendarDays(at, premiereReussiteAt) >= SOLIDE_ECART_JOURS ? 'solide' : 'acquis';",
    to: "return 'solide';",
    pourquoi: "le statut redevient fonction du seul dernier score : une réussite chanceuse suffit (journal.ts:211 d’avant S4-1)",
  },
  {
    id: "INV-61b", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/progression.ts",
    from: "differenceInCalendarDays(at, premiereReussiteAt) >= SOLIDE_ECART_JOURS",
    to: "(at - premiereReussiteAt) >= SOLIDE_ECART_JOURS * 86_400_000",
    pourquoi: "l’écart se mesure en 72 h au lieu de 3 jours calendaires",
  },
  {
    id: "INV-62", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/progression.ts",
    from: "if (avant === 'solide') return score >= PART_SOLIDE ? 'solide' : 'acquis';",
    to: "if (avant === 'solide' && score >= PART_SOLIDE) return 'solide';",
    pourquoi: "une mauvaise partie fait tomber un Teil solide à fragile : la descente ne tient plus compte de l’état précédent",
  },
  {
    id: "INV-56a", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/progression.ts",
    from: "const qual = toutSolide ? depuisSoudure(acc).filter(qualifiant) : [];",
    to: "const qual = toutSolide ? acc.mesures.filter(qualifiant) : [];",
    pourquoi: "un run en conditions d’examen ANTÉRIEUR à la soudure (ou à une retombée) soude l’anneau",
  },
  {
    id: "INV-56b", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/progression.ts",
    from: "e.examen === true && TEIL_KEYS",
    to: "(e.examen === true || e.enchaine === true) && TEIL_KEYS",
    pourquoi: "`enchaine` seul suffit à souder : l’ordre, l’Autonome et la langue ne comptent plus",
  },
  {
    id: "INV-56c", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/progression.ts",
    from: "{ acc.solideDepuis = null; acc.soudureIdx = null; }",
    to: "{ }",
    pourquoi: "une retombée ne défait pas la soudure : le vieux run redevient qualifiant à la re-solidification",
  },
  {
    id: "INV-59a", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/dialData.ts",
    from: "maitrise: cp.maitrise ?? null,",
    to: "maitrise: Math.round(TEILE.reduce((s, t) => s + (cp.teile[t].lastScore ?? 0), 0) / 3),",
    pourquoi: "le cadran recalcule la maîtrise (et la baisse par absence d’un Teil) au lieu de la lire",
  },
  {
    id: "INV-59b", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/dialData.ts",
    from: "soude: cp.etat === 'pret',",
    to: "soude: cp.etat === 'solide' || cp.etat === 'pret',",
    pourquoi: "le cadran soude l’anneau d’un cas seulement solide",
  },
  {
    id: "INV-66a", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/program/couverturePonderee.ts",
    from: "base += poids;",
    to: "base += f?.total ?? 0;",
    pourquoi: "le dénominateur est le total de protocoles, pas la base ventilée de la ville",
  },
  {
    id: "INV-66b", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/program/couverturePonderee.ts",
    from: "return r.portee === 'ville-ventilee' ? `${tete} ventilés de ${r.ville}` : `${tete}, toutes villes`;",
    to: "return tete;",
    pourquoi: "repli silencieux : la phrase ne dit plus ni la ville ni « toutes villes »",
  },
  {
    id: "INV-69a", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/program/trajectory.ts",
    from: "regle: 'serie3' | 'serie4' = dayKey(at) < DATE_NOUVELLE_REGLE ? 'serie3' : 'serie4'",
    to: "regle: 'serie3' | 'serie4' = 'serie4'",
    pourquoi: "la nouvelle règle est appliquée rétroactivement à la frise : tout le passé descend",
  },
  {
    id: "INV-75", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/journal.ts",
    from: "spentMin: Math.round(total / 60),",
    to: "spentMin: Math.round(secs / 60),",
    pourquoi: "le temps d’une partie ne compte que les Teile joués : le Teil abandonné disparaît (m6)",
  },
  {
    id: "b-couche", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/examen.ts",
    from: "? conditionsExamen(sim)",
    to: "? (conditionsExamen(sim) && sim.layer === 3)",
    pourquoi: "la couche réentre dans les conditions d’examen (décision (d)) : deux définitions",
  },
  {
    id: "b-ordre", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/examen.ts",
    from: "manque.push('ordre');",
    to: "void 0;",
    pourquoi: "l’ordre A → D → F n’est plus exigé pour être en conditions d’examen",
  },
  {
    id: "b-grille", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/examen.ts",
    from: "manque.push('grille');",
    to: "void 0;",
    pourquoi: "une grille de langue non saisie (−1) suffit à être en conditions d’examen",
  },
  {
    id: "e-anciens", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/journal.ts",
    from: "...(serie4 && manque.length === 0 ? { examen: true as const } : {}),",
    to: "...(manque.length === 0 || isExamenBlanc(sim) ? { examen: true as const } : {}),",
    pourquoi: "les anciens runs complets soudent l’anneau rétroactivement (décision (e), contradiction 12)",
  },
  // --- S4-1, revues (4 oct.) ---
  {
    id: "INV-61c", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/progression.ts",
    from: "if (s >= PART_SOLIDE && acc.premiere[t] === null) acc.premiere[t] = { at: te.at, score: s };",
    to: "if (s >= PART_SOLIDE) acc.premiere[t] = { at: te.at, score: s };",
    pourquoi: "le témoin de l’écart devient la DERNIÈRE réussite : une série de réussites rapprochées ne s’additionne plus (revue P1/m1)",
  },
  {
    id: "P3-solideDepuis", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/progression.ts",
    from: "else if (acc.solideDepuis === null) { acc.solideDepuis = te.at;",
    to: "else { acc.solideDepuis = te.at;",
    pourquoi: "`solideDepuis` avance à chaque partie : un run d’examen déjà fait cesse de souder (revue P3)",
  },
  {
    id: "I2-egalite", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/progression.ts",
    from: "(acc.soudureIdx === null ? [] : acc.mesures.slice(acc.soudureIdx))",
    to: "(acc.solideDepuis === null ? [] : acc.mesures.filter((e) => e.at >= acc.solideDepuis!))",
    pourquoi: "la soudure se compare par INSTANT : à instants égaux, un run qui la précède compte (revue I2, solide ⇔ pretManque)",
  },
  {
    id: "I1-pente", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/program/trajectory.ts",
    from: ".map((p) => indiceAt(events, totalTeile, addDays(parseISO(p.date), 1).getTime() - 1, 'serie4'));",
    to: ".map((p) => p.indice);",
    pourquoi: "la pente se lit sur les points AFFICHÉS : elle traverse la marche, ou disparaît le jour de la bascule (revue I1)",
  },
  {
    id: "P1-dette", tests: 'tests/invariants.mesure.test.ts', file: "src/lib/journal.ts",
    from: "teilAConfirmer(cp.teile[t], jour) ? POIDS_CONSOLIDATION : 1)",
    to: "teilAConfirmer(cp.teile[t], jour) ? 1 : 1)",
    pourquoi: "un Teil à confirmer pèse comme un Teil jamais travaillé : dix cas redevenus acquis remplissent le plan (revue P1)",
  },
  // --- S4-2 : la configuration et les refus synchronisés (training-journal.md §12.10 ; INV-68, INV-76) ---
  {
    id: "INV-76a-sans-evenement", tests: 'tests/invariants.config.test.ts', file: "src/lib/programAdjust.ts",
    from: "return ecrireConfig({ ...config, intensity });",
    to: "return setMeta('program', { ...config, intensity });",
    pourquoi: "`setIntensity` n'émet plus rien (l'état d'avant S4-2) : le budget de l'autre appareil ne suit jamais",
  },
  {
    id: "INV-76a-partiel", tests: 'tests/invariants.config.test.ts', file: "src/lib/programAdjust.ts",
    from: "return ecrireConfig(modus ? { ...sans, modus } : sans);",
    to: "return ecrireConfig((modus ? { modus } : {}) as never);",
    pourquoi: "payload partiel `{ modus }` : la projection d'un autre appareil écrase la config entière par un fragment",
  },
  {
    id: "INV-76b-avant-push", tests: 'tests/invariants.config.test.ts', file: "src/lib/sync/configProjetee.ts",
    from: "  await pousserConfigInitiale();                               // AVANT toute projection distante (N2b)\n",
    to: "",
    pourquoi: "la projection distante passe avant le push initial : la config locale d'avant la série 4 est écrasée",
  },
  {
    id: "INV-76b-garde", tests: 'tests/invariants.config.test.ts', file: "src/lib/sync/configProjetee.ts",
    from: "if (await db.meta.get(CONFIG_POUSSEE_S4)) return false;",
    to: "if (false as boolean) return false;",
    pourquoi: "garde absente : chaque démarrage pousse la config locale (double push)",
  },
  {
    id: "INV-76c-borne", tests: 'tests/invariants.config.test.ts', file: "src/lib/sync/configProjetee.ts",
    from: "p.hoursPerSession <= 0 ||",
    to: "p.hoursPerSession < 0.5 ||",
    pourquoi: "borne à 0,5 h : la config que `accepterRythme` produit (20 min) est refusée, puis ignorée par les autres appareils",
  },
  {
    id: "INV-76d-retombee", tests: 'tests/invariants.config.test.ts', file: "src/lib/sync/configProjetee.ts",
    from: "if (local?.value && cand.at <= localAt) return;",
    to: "if (false as boolean) return;",
    pourquoi: "après un refus serveur (événement retiré de l'outbox), la projection retombe sur une config plus ancienne",
  },
  {
    id: "INV-68-invalide", tests: 'tests/invariants.config.test.ts', file: "src/lib/sync/configProjetee.ts",
    from: "const config = lireConfig(tries[i].payload);",
    to: "const config = tries[i].payload as ProgramConfig;",
    pourquoi: "un payload invalide plus récent remplace la config valide",
  },
  {
    id: "INV-68-sans-projection", tests: 'tests/invariants.config.test.ts', file: "src/lib/sync/configProjetee.ts",
    from: "  if (!cand) return;\n  const [local, localAt]",
    to: "  return;\n  const [local, localAt]",
    pourquoi: "program.configured n'est pas projeté au retour (l'état d'avant S4-2) : deux appareils, deux programmes",
  },
  {
    id: "INV-68-refus-cumul", tests: 'tests/invariants.config.test.ts', file: "src/lib/sync/configProjetee.ts",
    from: ".filter((e) => Date.parse(e.occurred_at) > derniere)",
    to: ".filter(() => true)",
    pourquoi: "les refus de rythme ne repartent pas de zéro à la modification du programme (réserve P2)",
  },
  // --- S4-2 : la complétion dérivée et le rattrapage (training-journal.md §12.3, §12.8 ; INV-51, INV-52, INV-54, INV-58) ---
  {
    id: "INV-51-fige", tests: 'tests/invariants.completion.test.ts', file: "src/lib/program/completion.ts",
    from: "const premiere = completion ?? coches[0];\n  const statut",
    to: "const premiere = completion ?? coches[0] ?? tri.find((e) => e.taskId === T.id);\n  const statut",
    pourquoi: "`doneAt` redevient posé par le `taskId` écrit à l'écriture : une partie qui prétend satisfaire la tâche la coche",
  },
  {
    id: "INV-51-some", tests: 'tests/invariants.completion.test.ts', file: "src/lib/program/completion.ts",
    from: "voulus.every((t) => joues.has(t)))) completion = e;",
    to: "voulus.some((t) => joues.has(t)))) completion = e;",
    pourquoi: "`completeAssez` en `some` (journal.ts:347 d'avant S4-2) : une partie d'un Teil sur trois coche la tâche de cas entier",
  },
  {
    id: "INV-51-d-un-trait", tests: 'tests/invariants.completion.test.ts', file: "src/lib/program/completion.ts",
    from: "(T.dUnTrait ? e.enchaine === true : voulus.every",
    to: "(T.dUnTrait ? voulus.every((t) => joues.has(t)) : voulus.every",
    pourquoi: "une tâche « d'un trait » est cochée par des Teile joués séparément",
  },
  {
    id: "I5-libelle", tests: 'tests/invariants.d-un-trait.test.tsx', file: "src/features/program/TaskLine.tsx",
    from: "{aRejouer && <span className=\"dim-tag shrink-0\">{A_REJOUER}</span>}",
    to: "",
    pourquoi: "une tâche « d'un trait » entamée à part ne dit plus qu'elle reprend depuis l'Anamnese",
  },
  {
    id: "INV-51-fuseau", tests: 'tests/invariants.completion.test.ts', file: "src/lib/program/completion.ts",
    from: "const jour = debutJour(T.date, tz);\n  return { debut: Math.max(jour, T.creeA ?? jour), fin: finJour(T.date, tz) };",
    to: "const jour = debutJour(T.date);\n  return { debut: Math.max(jour, T.creeA ?? jour), fin: finJour(T.date) };",
    pourquoi: "le jour d'un événement se lit au fuseau de l'APPAREIL, plus à celui du plan : deux appareils ne s'accordent plus",
  },
  {
    id: "INV-51-fiche-autre-cas", tests: 'tests/invariants.completion.test.ts', file: "src/lib/program/completion.ts",
    from: "(T.caseId === undefined || e.caseId === T.caseId) && dans(e));",
    to: "dans(e));",
    pourquoi: "la fiche lue d'un AUTRE cas coche la tâche Fachwissen",
  },
  {
    id: "INV-51-coche-gagne", tests: 'tests/invariants.completion.test.ts', file: "src/lib/program/completion.ts",
    from: "const premiere = completion ?? coches[0];\n  const statut",
    to: "const premiere = coches[0] ?? completion;\n  const statut",
    pourquoi: "la coche nue absorbée reste l'événement qui fait foi : `doneAt` pointe un événement retiré de l'historique",
  },
  {
    id: "INV-52-entamee", tests: 'tests/invariants.completion.test.ts', file: "src/lib/program/completion.ts",
    from: "avancement.length > 0 ? 'entamee' : 'a-faire'",
    to: "'a-faire'",
    pourquoi: "une tâche entamée est rendue « à faire » : l'avancement du candidat disparaît du plan",
  },
  {
    id: "INV-52-reprise-entiere", tests: 'tests/invariants.completion.test.ts', file: "src/lib/program/rattrapage.ts",
    from: "kind, teile: e.reste, creeA: now(),",
    to: "kind, teile: teileDeTache(t), creeA: now(),",
    pourquoi: "la reprise d'une tâche entamée redemande le cas ENTIER au lieu de ce qui reste",
  },
  {
    id: "INV-52-reprise-d-un-trait", tests: 'tests/invariants.completion.test.ts', file: "src/lib/program/rattrapage.ts",
    from: "teil: _t, dUnTrait: _u, rappel: _r,",
    to: "teil: _t, rappel: _r,",
    pourquoi: "la reprise garde `dUnTrait` : un cas dont on a joué un Teil devra être rejoué d'un trait",
  },
  {
    id: "INV-54-teil", tests: 'tests/invariants.completion.test.ts', file: "src/lib/program/tacheDeCas.ts",
    from: "  if (t.teil) return [t.teil];\n",
    to: "",
    pourquoi: "`teileDeTache` ignore `teil` : un plan série 3 déjà figé demande tout à coup les trois Teile",
  },
  {
    id: "INV-58-ajoute", tests: 'tests/invariants.completion.test.ts', file: "src/lib/program/rattrapage.ts",
    from: "if (used + r.estMin > todayPlan.targetMin) {",
    to: "if (false as boolean) {",
    pourquoi: "une reprise hors budget s'ajoute au lieu de remplacer la première tâche de cas ni faite ni entamée",
  },
  {
    id: "INV-58-remplace-entamee", tests: 'tests/invariants.completion.test.ts', file: "src/lib/program/rattrapage.ts",
    from: "evaluerTache(t, events, tz).statut === 'a-faire';",
    to: "evaluerTache(t, events, tz).statut !== 'faite';",
    pourquoi: "la reprise remplace une tâche ENTAMÉE : le travail commencé du candidat disparaît",
  },
  // --- S4-2 : la construction du plan (training-journal.md §12.2, §12.4, §12.5, §13.1 ; INV-4, 50, 55, 57, 58, 60, 67) ---
  {
    id: "INV-50-teil", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/dayPlan.ts",
    from: "teile: d.teile, creeA,\n",
    to: "teile: d.teile, teil: d.teile[0], creeA,\n",
    pourquoi: "`buildTasks` repose `teil` : la tâche redevient « Anamnese de Leberzirrhose »",
  },
  {
    id: "INV-50-un-teil", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/dayPlan.ts",
    from: "const teile = restePlan(progress.get(s.c.id), date, tz);\n    const probable",
    to: "const teile = restePlan(progress.get(s.c.id), date, tz).slice(0, 1);\n    const probable",
    pourquoi: "`teile` ne porte qu'un Teil (le premier qui reste) au lieu de `restePlan`",
  },
  {
    id: "INV-67-deux-definitions", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/dayPlan.ts",
    from: "const teile = restePlan(progress.get(s.c.id), date, tz);\n    const probable",
    to: "const teile = TEIL_KEYS.filter((t) => (progress.get(s.c.id)?.teile[t].status ?? 'vierge') !== 'solide');\n    const probable",
    pourquoi: "deux définitions de « reste » : la tâche garde `status ≠ solide` seul, sans l'écart de trois jours (R2)",
  },
  {
    id: "INV-67-dette", tests: 'tests/invariants.plan.test.ts', file: "src/lib/journal.ts",
    from: "restePlan(cp, jour, tz).reduce((s, t) =>",
    to: "TEIL_KEYS.filter((t) => cp.teile[t].status !== 'solide').reduce((s, t) =>",
    pourquoi: "`detteTeil` garde `status ≠ solide` seul (journal.ts:271-272 d'avant S4-2) : un Teil joué hier pèse encore",
  },
  {
    id: "INV-55-now", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/dayPlan.ts",
    from: "    now: debut,\n    lastPlayedAt,",
    to: "    now: input.now,\n    lastPlayedAt,",
    pourquoi: "`selectContext` lit l'instant de matérialisation (`input.now`) : à 8 h et à 14 h, la fraîcheur — donc le plan — diffère",
  },
  {
    id: "INV-55-drill", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/dayPlan.ts",
    from: "const terms = counts(begriffe, fin - 1, input.favorites);",
    to: "const terms = counts(begriffe, input.now, input.favorites);",
    pourquoi: "`counts(begriffe, input.now)` : les termes dus se comptent à l'instant de matérialisation",
  },
  {
    id: "INV-55-case-progress", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/dayPlan.ts",
    from: "progress: e.progress, now: at,",
    to: "progress: new Map((await db.case_progress.toArray()).map((p) => [p.caseId, p])), now: at,",
    pourquoi: "la progression est lue dans `db.case_progress`, qui contient les parties du jour D",
  },
  {
    id: "INV-55-coupure", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/entree.ts",
    // Revue m1 : la coupure porte sur le journal SOURCE (occurred_at).
    from: "const avant = p.events.filter((e) => Date.parse(e.occurred_at) < coupure);",
    to: "const avant = p.events;",
    pourquoi: "l'entrée n'est plus coupée à `debutJour(D)` : les événements du jour D fuient dans le plan de D",
  },
  {
    id: "INV-55-srs", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/entree.ts",
    from: "const begriffe = begriffeAvant(p.begriffe, p.events, coupure);",
    to: "const begriffe = [...p.begriffe];",
    pourquoi: "l'état SRS vient de `db.fachbegriffe` (live, révisions du jour D comprises) au lieu d'être reconstruit",
  },
  {
    id: "INV-55-config", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/entree.ts",
    from: "const avant = valides.filter((x) => x.at < debut).pop();",
    to: "const avant = valides.pop();",
    pourquoi: "la config du jour est la dernière du journal, y compris celle modifiée AU COURS du jour D",
  },
  {
    id: "INV-57-boucle", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/modus.ts",
    from: "observeModus(events, cases) === 'teil-first' ? 'teil-first' : 'cas-complet';",
    to: "(observeModus(events, cases) ?? 'cas-complet') as 'cas-complet';",
    pourquoi: "`observeModus` brut pilote le mode : des examens à blanc planifiés font observer « examen-blanc », qui en planifie davantage (la boucle)",
  },
  {
    id: "INV-57-teil-first-explicite", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/modus.ts",
    from: "return config.modus === 'examen-blanc' || config.modus === 'specialite' ? config.modus : observeMode(events, cases);",
    to: "return config.modus ?? observeMode(events, cases);",
    pourquoi: "un `teil-first` explicite est respecté : le mode « par Teil » reste imposé en surface",
  },
  {
    id: "INV-58-break", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/dayPlan.ts",
    from: "const pool = premiere ? candidates : candidates.filter((s) => decrire(s).estMin <= room);",
    to: "const pool = premiere ? candidates : candidates.slice(0, 1).filter((s) => decrire(s).estMin <= room);",
    pourquoi: "`break` au premier candidat qui ne tient pas : un cas plus court derrière lui est oublié",
  },
  {
    id: "INV-58-unite", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/dayPlan.ts",
    from: "const pool = premiere ? candidates : candidates.filter((s) => decrire(s).estMin <= room);",
    to: "const pool = premiere ? candidates : candidates.filter(() => sommeTrois <= room);",
    pourquoi: "`floor(room / unitMin)` : tout cas coûte un cas entier, les restes d'un Teil ne remplissent plus le budget",
  },
  {
    id: "INV-58-deux-forcees", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/dayPlan.ts",
    from: "let premiere = !examenForce && input.forcerLaPremiere !== false;",
    to: "let premiere = input.forcerLaPremiere !== false;",
    pourquoi: "une tâche de cas forcée EN PLUS de l'examen à blanc : deux tâches dépassent le budget le même jour",
  },
  {
    id: "INV-60-sortie", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/select.ts",
    from: "const du = dette === 0 && estDu(cp, jour);",
    to: "const du = false;",
    pourquoi: "retour à `detteTeil = 0 ⇒ score 0` (select.ts:79 d'avant S4-2) : un cas solide sort pour toujours",
  },
  {
    id: "INV-60-intervalle", tests: 'tests/invariants.plan.test.ts', file: "src/lib/progression.ts",
    from: "CONSOLIDATION_JOURS[Math.min(k, CONSOLIDATION_JOURS.length - 1)]",
    to: "CONSOLIDATION_JOURS[0]",
    pourquoi: "intervalle constant : le cas revient toutes les semaines au lieu de 7, 21, puis 45 jours",
  },
  {
    id: "INV-60-d-un-trait", tests: ['tests/invariants.plan.test.ts', 'tests/invariants.d-un-trait.test.tsx'], file: "src/lib/program/parametres.ts",
    from: "export const D_UN_TRAIT_ACTIF = true;",
    to: "export const D_UN_TRAIT_ACTIF = false;",
    pourquoi: "garde recoupée après S4-3 : plus aucune tâche « d'un trait » alors que la partie sait enchaîner",
  },
  // --- S4-2, ce que le programme apprend (§13.3 à §13.5) ---
  {
    id: "INV-63-fenetre", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/erreurs.ts",
    from: ".slice(-ERREUR_FENETRE);", to: ";",
    pourquoi: "fenêtre ignorée : un item coché depuis des semaines reste signalé pour toujours",
  },
  {
    id: "INV-63-deux-cas", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/erreurs.ts",
    from: "ou.length >= ERREUR_SEUIL && cas >= ERREUR_CAS_MIN", to: "ou.length >= ERREUR_SEUIL",
    pourquoi: "seuil « 2 cas » ignoré : l'acharnement sur UN cas devient une erreur transversale",
  },
  {
    id: "INV-63-mesuree", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/erreurs.ts",
    from: "events.filter((e) => partieAvecChecklist(e, teil))", to: "events.filter((e) => e.manques?.[teil] !== undefined)",
    pourquoi: "une séance IA externe (auto-déclarée) entre dans la fenêtre des erreurs",
  },
  {
    id: "INV-63-examen-blanc", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/erreurs.ts",
    from: "(t.kind === 'simulation' || t.kind === 'revision') && t.dUnTrait !== true", to: "t.dUnTrait !== true",
    pourquoi: "rappel sur un examen à blanc (réserve T1)",
  },
  {
    id: "INV-63-d-un-trait", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/erreurs.ts",
    from: "(t.kind === 'simulation' || t.kind === 'revision') && t.dUnTrait !== true", to: "(t.kind === 'simulation' || t.kind === 'revision')",
    pourquoi: "rappel sur une tâche d'un trait (réserve T1)",
  },
  {
    id: "INV-63-doublon", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/erreurs.ts",
    from: "!dits.has(x.item) && ", to: "",
    pourquoi: "le même rappel répété sur chaque tâche du jour",
  },
  {
    id: "INV-64-moyenne", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/durees.ts",
    from: "const mediane = n % 2 ? mesures[(n - 1) / 2] : (mesures[n / 2 - 1] + mesures[n / 2]) / 2;", to: "const mediane = mesures.reduce((s, x) => s + x, 0) / n;",
    pourquoi: "moyenne au lieu de médiane : une partie oubliée ouverte la nuit fausse l'estimation",
  },
  {
    id: "INV-64-repli", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/durees.ts",
    from: "if (mesures.length < DUREE_MIN_MESURES) return TEIL_MIN[t];", to: "if (mesures.length === 0) return TEIL_MIN[t];",
    pourquoi: "repli absent : une seule mesure fait l'estimation",
  },
  {
    id: "INV-64-ia-externe", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/durees.ts",
    from: ".filter((e) => partieMesuree(e) && (e.minutesParTeil?.[t] ?? 0) > 0)", to: ".filter((e) => (e.minutesParTeil?.[t] ?? 0) > 0)",
    pourquoi: "les séances auto-déclarées entrent dans les durées",
  },
  {
    id: "INV-64-teil-first", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/dayPlan.ts",
    from: "const estMin = teilHabituel ? duree(probable) : teile.reduce((sum, t) => sum + duree(t), 0);", to: "const estMin = teile.reduce((sum, t) => sum + duree(t), 0);",
    pourquoi: "Σ des Teile en mode observé « par Teil » sur une tâche `simulation` (m13)",
  },
  {
    id: "INV-64-un-teil", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/dayPlan.ts",
    from: "const sommeTrois = TEIL_KEYS.reduce((s, t) => s + duree(t), 0);", to: "const sommeTrois = teilHabituel ? duree(teilHabituel) : TEIL_KEYS.reduce((s, t) => s + duree(t), 0);",
    pourquoi: "estimation réduite à un Teil sur une `revision` ou un examen à blanc (m-b)",
  },
  {
    id: "INV-64-consolidation-teil-first", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/dayPlan.ts",
    from: "candidates.filter((s) => s.parts.du || restePlan(", to: "candidates.filter((s) => restePlan(",
    pourquoi: "observé « par Teil » : la consolidation d'un cas solide dû disparaît",
  },
  {
    id: "INV-64-reprise", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/rattrapage.ts",
    from: "estMin: e.reste.reduce((s, k) => s + duree[k], 0),", to: "estMin: Math.max(5, Math.round((t.estMin * e.reste.length) / 3)),",
    pourquoi: "la reprise « finir hier » garde une part de l'ancienne estimation au lieu de Σ dureeTeil du reste",
  },
  {
    id: "INV-58-reprise-sur-reprise", tests: 'tests/invariants.completion.test.ts', file: "src/lib/program/rattrapage.ts",
    from: "!p.tasks.includes(t) && remplacable(", to: "remplacable(",
    pourquoi: "hors budget, une reprise écrase la reprise qu'on vient d'insérer au lieu d'une tâche du jour",
  },
  {
    id: "INV-76b-fusion", tests: 'tests/invariants.config.test.ts', file: "src/lib/sync/configProjetee.ts",
    from: "const pousse: ProgramConfig = emise ? (() => {", to: "const pousse: ProgramConfig = false ? (() => {",
    pourquoi: "revue I4 : le push initial d'un second appareil pousse sa config locale périmée et écrase les dates et le budget du premier",
  },
  {
    id: "INV-76b-garde-ecriture", tests: 'tests/invariants.config.test.ts', file: "src/lib/sync/configProjetee.ts",
    from: "(il fusionnerait avec une config plus ancienne).\n    await db.meta.put({ key: CONFIG_POUSSEE_S4, value: true });", to: "(il fusionnerait avec une config plus ancienne).",
    pourquoi: "une config écrite en S4 puis refusée : le push initial la remplace par une config plus ancienne du journal",
  },
  {
    id: "INV-55-coupure-at", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/entree.ts",
    from: "const trainingEvents = projectTrainingEvents(avant as ProgressEvent[]);",
    to: "const trainingEvents = projectTrainingEvents(p.events as ProgressEvent[]).filter((e) => e.at < coupure);",
    pourquoi: "revue m1 : le plan coupe sur `at` — une partie commencée à 23 h 50 et enregistrée après minuit change le plan du lendemain",
  },
  {
    id: "INV-55-perso-live", tests: 'tests/invariants.plan.test.ts', file: "src/lib/program/entree.ts",
    from: "begriffeAvant((p.personal ?? []).filter((t) => Date.parse(t.createdAt) < coupure), p.events, coupure).filter((t) => isNew(t.srs)).length",
    to: "(p.personal ?? []).filter((t) => isNew(t.srs)).length",
    pourquoi: "revue m2 : l'état SRS LIVE des termes personnels (révisés le jour D) entre dans le plan du jour D",
  },
  {
    id: "INV-65-arrondi-bas", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/rythme.ts",
    from: "Math.ceil(moyenne / 5 - 1e-9) * 5", to: "Math.round(moyenne / 5) * 5",
    pourquoi: "revue m3 : la proposition s'arrondit vers le bas — le temps réel ne tient plus dans le budget proposé",
  },
  {
    id: "INV-65-hors-curseur", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/rythme.ts",
    from: "return ecrireConfig({ ...config, hoursPerSession: sessionPour(valeur, config.intensity) / 60 });",
    to: "return ecrireConfig({ ...config, hoursPerSession: valeur / (60 * INTENSITY_FACTOR[config.intensity]) });",
    pourquoi: "revue m4 : accepter écrit 0,2564 h, une valeur que le curseur de ProgramSetup ne sait pas afficher",
  },
  {
    id: "INV-65-apres-examen", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/rythme.ts",
    from: "const apresExamen = !!exam && date >= exam;", to: "const apresExamen = false;",
    pourquoi: "VETO pédagogique : la carte propose de caler un rythme qui repousse les cas fréquents après l'examen, sans le dire",
  },
  {
    id: "INV-65-hausse", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/rythme.ts",
    from: "return valeur < dayTargetMin(i.config) ? { valeur, semaine, minutesSession, moyenne } : null;", to: "return { valeur, semaine, minutesSession, moyenne };",
    pourquoi: "proposition à la hausse (ou égale au budget)",
  },
  {
    id: "INV-65-plancher", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/rythme.ts",
    from: "sessionPour(Math.max(BUDGET_PLANCHER_MIN, Math.ceil(", to: "sessionPour(Math.max(0, Math.ceil(",
    pourquoi: "proposition sous le plancher de 20 min",
  },
  {
    id: "INV-65-seuil", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/rythme.ts",
    from: "if (!(spent < RYTHME_SEUIL * cible)) return null;", to: "if (!(spent < cible)) return null;",
    pourquoi: "seuil de 60 % ignoré : la moindre minute manquante déclenche la proposition",
  },
  {
    id: "INV-65-jour-off", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/rythme.ts",
    from: "fenetre.has(p.date) && p.tasks.length > 0", to: "fenetre.has(p.date)",
    pourquoi: "un jour off ouvert compte comme un budget non tenu",
  },
  {
    id: "INV-65-deux-refus", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/rythme.ts",
    from: " || i.refus.depuisDerniereConfig >= RYTHME_REFUS_MAX", to: "",
    pourquoi: "deux refus de suite n'arrêtent pas les propositions (réserve P2)",
  },
  {
    id: "INV-65-refus-local", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/rythme.ts",
    from: "await syncQueue.push({ type: 'rythme.refused', subject_id: semaine, payload: {} });", to: "void syncQueue; await db.meta.put({ key: 'rythmeRefuse', value: semaine });",
    pourquoi: "refus non synchronisé : l'autre appareil repropose",
  },
  {
    id: "INV-65-partiel", tests: 'tests/invariants.apprentissage.test.ts', file: "src/lib/program/rythme.ts",
    from: "return ecrireConfig({ ...config, hoursPerSession: sessionPour(valeur, config.intensity) / 60 });", to: "return ecrireConfig({ hoursPerSession: sessionPour(valeur, config.intensity) / 60 } as ProgramConfig);",
    pourquoi: "accepter écrit un fragment de config (INV-76 a)",
  },
  // --- S4-3 : la partie, le cas entier (simulation-run.md §10, §7.1 ; INV-70 à INV-75, côté écriture) ---
  {
    id: 'INV-70', tests: 'tests/invariants.partie.test.tsx', file: 'src/features/simulation/useLauf.ts',
    from: "        profileId: getActiveUserId() ?? undefined,\n        ...(taskId ? { taskId } : {}),",
    to: "        profileId: getActiveUserId() ?? undefined,\n        ...(departRef.current ? { geplanteTeile: [departRef.current], modus: 'teil' as const } : {}),\n        ...(taskId ? { taskId } : {}),",
    pourquoi: 'useLauf relit le départ (`?teil=`) comme PÉRIMÈTRE : la partie ne porte plus qu’un Teil',
  },
  {
    id: 'INV-71', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "    case 'versChecklist': {\n      if (lauf.zustand !== 'bilanz') return lauf;",
    to: "    case 'versChecklist': {\n      if (lauf.zustand !== 'bilanz' || naechsterTeil(lauf) !== null) return lauf;",
    pourquoi: '« Terminer ici » refusé tant qu’il reste un Teil : la partie redevient tout ou rien',
  },
  {
    id: 'INV-72a', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "if (reprise !== unterbrochenerTeil && (!lauf.geplanteTeile.includes(reprise) || lauf.teileGespielt.includes(reprise))) return lauf;",
    to: "if (reprise !== unterbrochenerTeil && !lauf.geplanteTeile.includes(reprise)) return lauf;",
    pourquoi: 'partieSuivante(t\') accepte un Teil déjà joué : un Teil joué deux fois dans la même partie',
  },
  {
    id: 'INV-72b', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "      if (unterbrochenerTeil && reprise !== unterbrochenerTeil) return lauf;\n",
    to: "",
    pourquoi: 'après une Aufklärung, le fil d’étapes saute le Teil interrompu',
  },
  {
    id: 'INV-72c', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "      if (lauf.teileGespielt.some((t) => t !== 'aufklaerung')) return lauf;\n",
    to: "",
    pourquoi: 'springeZu permis après un Teil terminé : le départ ailleurs devient un saut en pleine partie',
  },
  {
    id: 'INV-72d', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "if (lauf.zustand !== 'laufend' || !lauf.aktuellerTeil || lauf.aktuellerTeil === 'aufklaerung') return lauf;",
    to: "if (lauf.zustand !== 'laufend' || !lauf.aktuellerTeil) return lauf;",
    pourquoi: 'springeZu permis pendant une Aufklärung : on quitte l’interruption du jury par le fil d’étapes',
  },
  {
    id: 'INV-72e', tests: 'tests/invariants.partie.test.tsx', file: 'src/lib/lauf/speichern.ts',
    from: "dauerGesamtSec: Object.values(lauf.sekundenProTeil).reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0),",
    to: "dauerGesamtSec: lauf.teileGespielt.reduce<number>((s, t) => s + (lauf.sekundenProTeil[t] ?? 0), 0),",
    pourquoi: '`dauerGesamtSec` = Σ des seuls Teile joués : le Teil quitté par springeZu disparaît (m6)',
  },
  {
    id: 'INV-73a', tests: 'tests/invariants.partie.test.tsx', file: 'src/lib/lauf/speichern.ts',
    from: "...(enchainiert(lauf) ? { enchaine: true as const } : {}),",
    to: "...(istVollstaendig(lauf) ? { enchaine: true as const } : {}),",
    pourquoi: '`enchaine = istVollstaendig(lauf)` seul : une partie interrompue 5 min passe pour « d’un trait »',
  },
  {
    id: 'INV-73b', tests: 'tests/invariants.partie.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "return pause >= REPRISE_TOLERANZ_MIN * 60_000 ? { ...lauf, unterbrochen: true } : lauf;",
    to: "return pause >= 0 ? { ...lauf, unterbrochen: true } : lauf;",
    pourquoi: '`unterbrochen` posé à toute reprise, même de 30 s : un incident technique casse l’enchaînement',
  },
  {
    id: 'INV-73c', tests: 'tests/invariants.partie.test.tsx', file: 'src/features/simulation/useLauf.ts',
    from: "        setLauf(nimmWiederAuf(alt, now()));",
    to: "        setLauf(alt);",
    pourquoi: 'la reprise ne passe plus par nimmWiederAuf : une pause d’une heure ne casse rien',
  },
  {
    id: 'INV-73d', tests: 'tests/invariants.partie.test.tsx', file: 'src/lib/lauf/speichern.ts',
    from: "setMeta(LAUF_AKTIV_KEY, { ...lauf, zuletztAktiv: stamp })",
    to: "setMeta(LAUF_AKTIV_KEY, { ...lauf, unterbrochen: undefined, zuletztAktiv: stamp })",
    pourquoi: '`unterbrochen` remis à `undefined` à la persistance : une seconde reprise courte efface l’interruption',
  },
  {
    id: 'INV-75-ecriture', tests: 'tests/invariants.partie.test.tsx', file: 'src/lib/lauf/speichern.ts',
    from: "    date: lauf.startedAt,",
    to: "    date: now(),",
    pourquoi: '`date = now()` à l’écriture : une partie commencée à 23 h 50 compte pour le lendemain',
  },
  // --- S4-3 fixeur (revues méca + direction, décisions de main du 5 oct.) ---
  {
    id: 'fixeur-I4', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "      if (!lauf.teileGespielt.some((t) => t !== 'aufklaerung')) return lauf;\n",
    to: "",
    pourquoi: '« Terminer ici » permis sur la seule Aufklärung : une Simulation sans aucun Teil (reihenfolge: []) entre au journal',
  },
  {
    id: 'fixeur-M3', tests: 'tests/invariants.partie.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "  if (!lauf.geplanteTeile.some((t) => !lauf.teileGespielt.includes(t))) return lauf;\n",
    to: "",
    pourquoi: 'une pause au bilan final (trois Teile joués d’affilée) casse l’enchaînement',
  },
  {
    id: 'fixeur-I11', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "      if ((lauf.sekundenProTeil[lauf.aktuellerTeil] ?? 0) > 0) return lauf;\n",
    to: "",
    pourquoi: '« Commencer par » un autre Teil quitte un Teil en cours, chrono lancé',
  },
  {
    id: 'fixeur-M6', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "  if (a.typ === 'partieSuivante' && transition(lauf, { typ: 'partieSuivante' }).aktuellerTeil === teil) return null;\n",
    to: "",
    pourquoi: 'au bilan, la pastille du Teil par défaut double « Continuer — X »',
  },
  {
    id: 'fixeur-M5-completion', tests: 'tests/invariants.reprise-lendemain.test.ts', file: 'src/lib/program/completion.ts',
    from: "    if (!partieJouee(e) || e.caseId !== T.caseId || !dansCas(e)) continue;",
    to: "    if (!partieJouee(e) || e.caseId !== T.caseId || !dans(e)) continue;",
    pourquoi: 'une partie commencée la veille et enregistrée ce matin ne fait pas « Finir X » (fenêtre sur le début)',
  },
  {
    id: 'fixeur-M5-derive', tests: 'tests/invariants.reprise-lendemain.test.ts', file: 'src/lib/program/completion.ts',
    from: "dansLeJour(e.at) || dansLeJour(e.enregistreA ?? e.at) ||",
    to: "dansLeJour(e.at) ||",
    pourquoi: 'le plan du jour ne voit pas la partie enregistrée ce jour-là, commencée la veille',
  },
  {
    id: 'fixeur-M5-local', tests: 'tests/invariants.reprise-lendemain.test.ts', file: 'src/lib/journal.ts',
    from: "db.training_events.where('at').aboveOrEqual(debutJour(plan.date, plan.tz) - DAY_MS).toArray();",
    to: "db.training_events.where('at').aboveOrEqual(debutJour(plan.date, plan.tz)).toArray();",
    pourquoi: 'la projection locale ne relit pas la partie commencée la veille : la tâche ne se coche qu’au prochain rebuild',
  },
  {
    id: 'fixeur-M5-creeA', tests: 'tests/invariants.reprise-lendemain.test.ts', file: 'src/lib/program/completion.ts',
    from: "const dansCas = (e: TrainingEvent) => enregistree(e) >= debut && ",
    to: "const dansCas = (e: TrainingEvent) => ",
    pourquoi: 'une partie enregistrée AVANT la création de la tâche la fait quand même',
  },
  {
    id: 'INV-74', tests: 'tests/invariants.muster.test.tsx', file: 'src/components/BogenPreview.tsx',
    from: "const cles = [...bogenKeysOf(spec).filter((k) => !!bogen[k]?.trim()), ...autresNotes(bogen, spec)];",
    to: "const cles = bogenKeysOf(spec).filter((k) => !!bogen[k]?.trim());",
    pourquoi: 'l’aperçu n’itère que les rubriques du nouveau Muster : une note `allergien` d’une simulation « Stuttgart » lue en « libre » disparaît',
  },
  {
    id: 'INV-74-total', tests: 'tests/invariants.muster.test.tsx', file: 'src/data/guides/musterBogen.ts',
    from: "  : 'libre';                                        // Freiburg, Karlsruhe, Reutlingen, Stuttgart",
    to: "  : 'guide';",
    pourquoi: 'une ville de la série 3 est relue « guidé » au lieu de « libre » (§10.6)',
  },
  // --- S4-5 : la page Programme (tests/invariants.page-programme.test.ts) ---
  {
    id: 'S45-semaine-off', tests: 'tests/invariants.page-programme.test.ts', file: 'src/lib/program/pageProgramme.ts',
    from: 'return { date, off: plan.tasks.length === 0, points };', to: 'return { date, off: false, points };',
    pourquoi: 'un jour off figé (plan sans tâche) n’est plus neutre : il se lit comme un jour vide',
  },
  {
    id: 'S45-semaine-entame', tests: 'tests/invariants.page-programme.test.ts', file: 'src/lib/program/pageProgramme.ts',
    from: "evaluerTache(t, i.events, plan.tz).statut === 'entamee' ? 'entame' : 'prevu'", to: "'prevu'",
    pourquoi: 'un cas entamé se lit comme un cas pas commencé (le point ne bouge pas quand une partie le fait avancer)',
  },
  {
    id: 'S45-semaine-drill', tests: 'tests/invariants.page-programme.test.ts', file: 'src/lib/program/pageProgramme.ts',
    from: 'const points = plan.tasks.filter((t) => estTacheDeCas(t.kind)).map(', to: 'const points = plan.tasks.map(',
    pourquoi: 'un drill devient un point : la semaine ne compte plus des cas',
  },
  {
    id: 'S45-projection-soir', tests: 'tests/invariants.page-programme.test.ts', file: 'src/lib/program/pageProgramme.ts',
    from: 'const avant = i.events.filter((e) => e.at < debutJour(i.today));', to: 'const avant = [...i.events];',
    pourquoi: 'la projection bouge pendant la journée (elle n’est plus « recalculée chaque soir »)',
  },
  {
    id: 'S45-projection-cas', tests: 'tests/invariants.page-programme.test.ts', file: 'src/lib/program/pageProgramme.ts',
    from: 'partieJouee(e) && e.at >= debut', to: 'e.at >= debut',
    pourquoi: 'le rythme compte le drill : une soirée de Fachbegriffe avance la date des cas',
  },
  {
    id: 'S45-projection-jours', tests: 'tests/invariants.page-programme.test.ts', file: 'src/lib/program/pageProgramme.ts',
    from: 'if (ouvres < RYTHME_MIN_JOURS) return null;', to: 'if (ouvres < 1) return null;',
    pourquoi: 'une projection sur un ou deux jours de rythme : une phrase sans base',
  },
  {
    id: 'S45-projection-apres', tests: 'tests/invariants.page-programme.test.ts', file: 'src/lib/program/pageProgramme.ts',
    from: 'const marge = ecart > 0 ? ecart : null;', to: 'const marge = ecart;',
    pourquoi: 'une date après l’examen se dit en « marge » négative au lieu de « après ton examen »',
  },
  {
    id: 'S45-encart-poids', tests: 'tests/invariants.page-programme.test.ts', file: 'src/lib/program/pageProgramme.ts',
    from: 'const blanc = s.cas.filter(vierge).reduce((x, c) => x + poids(c), 0);', to: 'const blanc = s.cas.filter(vierge).length;',
    pourquoi: 'l’encart compte les cas au lieu de les peser : la couverture n’est plus pondérée par la fréquence',
  },
  {
    id: 'S45-encart-portee', tests: 'tests/invariants.page-programme.test.ts', file: 'src/lib/program/couverturePonderee.ts',
    from: "const portee = r.portee === 'ville-ventilee' ? ` ventilés de ${r.ville}` : ', toutes villes';", to: "const portee = '';",
    pourquoi: 'la fréquence de l’encart ne dit plus sa portée (§12.9)',
  },
];

/** Mutations jouées par le candidat NAVIGATEUR : { id: invariant attendu KO, days: jours à jouer }. */
export const NAV_MUTATIONS = [
  { id: 'D1', days: 1, file: 'src/lib/journal.ts', from: MUTATIONS[0].from, to: MUTATIONS[0].to, pourquoi: 'cocher fait apparaître une tâche de plus' },
  { id: 'D2', days: 1, file: 'src/lib/program/dayPlan.ts', from: 'plan?.tasks.find((t) => t.doneAt === undefined) ?? null;', to: 'plan?.tasks[plan.tasks.length - 1] ?? null;', pourquoi: 'l’accueil propose une autre session que la première tâche du plan (Leberzirrhose)' },
  { id: 'D3', days: 2, file: 'src/lib/stats.ts', from: "if (p.status === 'fragile' && p.lastScore !== null) out.push({ c, teil: t.key, score: p.lastScore });", to: "if (p.status !== 'solide') out.push({ c, teil: t.key, score: p.lastScore ?? 0 });", pourquoi: 'les « points faibles » accusent un Teil jamais tenté' },
  { id: 'D4', days: 1, file: 'src/lib/program/select.ts', from: 'picked.length === 0 || picked[picked.length - 1] !== next;', to: 'picked.length === 0 || picked[picked.length - 1] !== next || true;', pourquoi: 'deux spécialités identiques se suivent' },
  { id: 'D5', days: 1, file: 'src/features/program/HistoriquePage.tsx', from: '  const filtered = useMemo(() => (events ?? []).filter((e) => {\n', to: "  const filtered = useMemo(() => (events ?? []).filter((e) => {\n    if (e.kind === 'drill') return false;\n", pourquoi: 'l’historique masque un genre d’exercice' },
  { id: 'D5r', days: 1, file: 'src/features/stats/StatsPage.tsx', from: '{sims.filter(isFullSimulation).length} simulations complètes', to: '{sims.length} simulations complètes', pourquoi: 'les stats comptent une partie seule comme une simulation complète (simScope.ts:19-23)' },
  { id: 'D14', days: 2, file: 'src/lib/stats.ts', from: 'while (workedDays.has(dayKey(cursor))) { streak++;', to: 'while (workedDays.has(dayKey(cursor))) { streak += 2;', pourquoi: 'la série compte double' },
  { id: 'D6', days: 1, file: 'src/lib/program/dayPlan.ts', from: '  if (existing) return existing;                                  // « figé » veut dire que le premier fige\n', to: "  if (existing && existing.date === '') return existing;\n", pourquoi: 'le jour est recalculé à chaque ouverture' },
  { id: 'D8', days: 2, file: 'src/lib/simulationSave.ts', from: '  if (!nouveau) return sim;\n', to: '  if (!nouveau && nouveau) return sim;\n', pourquoi: 'une partie validée deux fois est écrite deux fois (l\'idempotence ET la garde du bouton sont retirées : le bouton seul tient déjà un double clic, l\'idempotence seule est prouvée par INV-22)',
    also: [{ file: 'src/features/simulation/useLauf.ts', from: '    setLauf(fertig);\n    setFehler(null);', to: '    setFehler(null);' }] },
  { id: 'D9', days: 7, file: 'src/features/simulation/PendingExternalSimCard.tsx', from: MUTATIONS.find((m) => m.id === 'FB3-3oct').from, to: "    if (couvre === undefined) return null;\n", pourquoi: 'le correctif du 3 octobre est retiré' },
  { id: 'D10', days: 3, file: 'src/lib/lauf/speichern.ts', from: '  return restauriere(l);\n}', to: '  return { ...restauriere(l), sekundenProTeil: {} };\n}', pourquoi: 'une partie interrompue reprend avec le chrono à zéro' },
];

/** Copie complète (build possible) : <tmp>/app + <tmp>/packages/tokens (lu par tailwind.config.js). Rend le dossier app. */
function copyAppFull() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'c6-nav-'));
  const dir = path.join(root, 'app');
  fs.mkdirSync(dir);
  for (const f of ['src', 'scripts', 'supabase/functions/_shared', 'public', 'index.html', 'package.json', 'vite.config.ts', 'tsconfig.json', 'postcss.config.js', 'tailwind.config.js']) {
    if (fs.existsSync(path.join(APP, f))) fs.cpSync(path.join(APP, f), path.join(dir, f), { recursive: true });   // supabase/functions/_shared : importé par src/lib
  }
  fs.cpSync(path.join(APP, '../packages/tokens'), path.join(root, 'packages/tokens'), { recursive: true, filter: (p) => !p.includes('node_modules') });
  fs.mkdirSync(path.join(dir, 'docs/reports'), { recursive: true });
  fs.symlinkSync(fs.realpathSync(path.join(APP, 'node_modules')), path.join(dir, 'node_modules'));
  return dir;
}

if (argv.includes('--navigateur')) {
  const envFile = argv[argv.indexOf('--env-file') + 1];
  if (!envFile) { console.error('--env-file requis (Supabase LOCAL)'); process.exit(2); }
  let ok = true, port = 5300;
  for (const m of NAV_MUTATIONS.filter((x) => !only || only.includes(x.id))) {
    const dir = copyAppFull();
    const f = path.join(dir, m.file), src = fs.readFileSync(f, 'utf8');
    if (src.split(m.from).length - 1 !== 1) { console.log(`FAIL  ${m.id} — MUTATION INAPPLICABLE`); ok = false; continue; }
    fs.writeFileSync(f, src.replace(m.from, () => m.to));
    for (const x of m.also ?? []) {
      const g = path.join(dir, x.file), t = fs.readFileSync(g, 'utf8');
      if (t.split(x.from).length - 1 !== 1) { console.log(`FAIL  ${m.id} — MUTATION COMPLÉMENTAIRE INAPPLICABLE (${x.file})`); ok = false; continue; }
      fs.writeFileSync(g, t.replace(x.from, () => x.to));
    }
    const r = spawnSync('node', ['scripts/parcours-candidat.mjs', '--env-file', envFile, '--days', String(m.days), '--port', String(port++),
      '--out', path.join(dir, 'docs/reports/rapport.md'), '--shots', path.join(dir, 'captures')], { cwd: dir, encoding: 'utf8', maxBuffer: 1 << 26 });
    const ko = (r.stdout ?? '').split('\n').filter((l) => /^KO\s+\w+/.test(l));
    const killed = r.status === 1 && ko.some((l) => l.startsWith(`KO  ${m.id} `));
    ok &&= killed;
    console.log(`${killed ? 'OK  ' : 'FAIL'}  ${m.id} — ${killed ? 'TUÉE' : r.status === 2 ? 'HARNAIS EN DÉFAUT' : 'SURVIVANTE'} · ${m.pourquoi}`);
    for (const l of ko.filter((l) => l.startsWith(`KO  ${m.id} `)).slice(0, 2)) console.log(`        ↳ ${l.slice(0, 220)}`);
    if (!killed) console.log((r.stdout ?? '').slice(-600) + (r.stderr ?? '').slice(-400));
    if (!keep) fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  }
  console.log(ok ? '\nToutes les mutations du candidat sont tuées.' : '\nÉCHEC : une mutation survit.');
  process.exit(ok ? 0 : 1);
}

function run(cwd, tests) {
  const out = path.join(cwd, 'vitest-out.json');
  const r = spawnSync(path.join(cwd, 'node_modules/.bin/vitest'), ['run', '--dir', 'tests', ...tests, '--reporter=json', `--outputFile=${out}`],
    { cwd, encoding: 'utf8', maxBuffer: 1 << 26 });
  let failed = [];
  try {
    const j = JSON.parse(fs.readFileSync(out, 'utf8'));
    failed = j.testResults.flatMap((f) => f.assertionResults.filter((a) => a.status === 'failed' && !/timed out/i.test(String(a.failureMessages?.[0] ?? ''))).map((a) => `${a.fullName ?? a.title}\n          ⇒ ${String(a.failureMessages?.[0] ?? '').split('\n')[0].slice(0, 170)}`));
  } catch { /* pas de rapport : on s'en tient au code de sortie */ }
  return { code: r.status, failed, tail: (r.stderr ?? '').split('\n').slice(-6).join('\n') };
}

function copyApp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'c6-mut-'));
  for (const f of ['src', 'tests', 'package.json', 'vitest.config.ts', 'tsconfig.json']) {
    fs.cpSync(path.join(APP, f), path.join(dir, f), { recursive: true });
  }
  fs.symlinkSync(fs.realpathSync(path.join(APP, 'node_modules')), path.join(dir, 'node_modules'));
  return dir;
}

const wanted = MUTATIONS.filter((m) => !only || only.includes(m.id));
const testsOf = [...new Set(wanted.flatMap((m) => [].concat(m.tests)))];
const rows = [];
let ok = true;

const base = copyApp();
const b = run(base, testsOf);
console.log(`baseline (copie intacte) : ${b.code === 0 ? 'VERT' : 'ROUGE — ' + b.failed.join(' | ')}`);
if (b.code !== 0) { console.log(b.tail); ok = false; }
if (!keep) fs.rmSync(base, { recursive: true, force: true });

if (ok) {
  for (const m of wanted) {
    const dir = copyApp();
    const f = path.join(dir, m.file);
    const src = fs.readFileSync(f, 'utf8');
    const n = src.split(m.from).length - 1;
    if (n !== 1) { rows.push({ id: m.id, verdict: `MUTATION INAPPLICABLE (${n} occurrence(s) de « ${m.from.slice(0, 50)}… »)` }); ok = false; fs.rmSync(dir, { recursive: true, force: true }); continue; }
    fs.writeFileSync(f, src.replace(m.from, () => m.to));
    const r = run(dir, [].concat(m.tests));
    const killed = r.code !== 0 && r.failed.length > 0;
    rows.push({ id: m.id, verdict: killed ? 'TUÉE' : 'SURVIVANTE', pourquoi: m.pourquoi, failed: r.failed });
    if (!killed) ok = false;
    if (!keep) fs.rmSync(dir, { recursive: true, force: true });
  }
}

for (const r of rows) {
  console.log(`${r.verdict === 'TUÉE' ? 'OK  ' : 'FAIL'}  ${r.id} — ${r.verdict}${r.pourquoi ? ` · ${r.pourquoi}` : ''}`);
  for (const t of r.failed ?? []) console.log(`        ↳ rougit : ${t}`);
}
console.log(ok ? `\n${rows.length}/${rows.length} mutations tuées.` : '\nÉCHEC : une mutation survit, ou le baseline est rouge.');
process.exit(ok ? 0 : 1);
