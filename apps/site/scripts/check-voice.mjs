#!/usr/bin/env node
// Vérifie la voix de marque (app/docs/brand/VOIX.md §08, PHILOSOPHIE.md §08)
// sur le HTML construit. Ne lit que le TEXTE VISIBLE : ni attributs, ni script, ni style
// (réutilise textOf/listHtml de lib/dist.mjs, comme check-no-promise.mjs et check-legal.mjs).
//
// README des règles (voice.lexicon.json) :
//  vouvoiement            VOIX.md §01/§08 — une seule personne grammaticale (tutoiement), jamais
//                          de Sie. EXEMPTÉE sur les 4 pages légales, voir
//                          VOUVOIEMENT_EXEMPT_PATHS ci-dessous (arbitrage tâche 5, réserve n°1)
//  scolaire               VOIX.md §08 — vocabulaire scolaire : on n'enseigne pas à un médecin
//  hype                   VOIX.md §08 — l'IA comme argument, le superlatif générique
//  promesse               VOIX.md §08 — toute forme de promesse de réussite
//  fuite                  confidentialité de l'examen : ne jamais laisser croire à un accès aux sujets
//  jeu                    VOIX.md §08 — jargon de jeu en façade (les mécaniques existent, le discours n'en parle pas)
//  metaphore_explicitee   PHILOSOPHIE.md §08 — la métaphore de la pieuvre ne s'explique jamais
//  sauvetage              PHILOSOPHIE.md §08 — aucun sauvetage, aucune noyade, aucune tempête
//  bareme                 confidentialité du barème exact (60 % / 60 points)
//  exclamation            VOIX.md §05 — zéro point d'exclamation en allemand public
//
// Un contexte nié (« keine Erfolgsquote ») est exclu de toutes les règles, voir NEGATIONS
// ci-dessous (arbitrage tâche 5, réserve n°2).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listHtml, textOf, report } from './lib/dist.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const LEXICON = JSON.parse(readFileSync(join(here, 'voice.lexicon.json'), 'utf8'));

// Arbitrage tâche 5, réserve n°1 (retenue) : le vouvoiement est l'usage juridique allemand, et
// une Widerrufsbelehrung porte des formules statutaires qu'on ne réécrit pas au tutoiement.
// Seule la règle `vouvoiement` est levée, et seulement sur ces 4 chemins — toutes les autres
// règles (promesse, jeu, bareme, …) continuent de s'y appliquer pleinement.
const VOUVOIEMENT_EXEMPT_PATHS = ['/de/agb/', '/de/datenschutz/', '/de/widerruf/', '/de/impressum/'];
const isVouvoiementExempt = (file) => VOUVOIEMENT_EXEMPT_PATHS.some((p) => file.includes(p));

// Arbitrage tâche 5, réserve n°2 (retenue) : même mécanisme de négation que
// check-no-promise.mjs — mot immédiatement précédent (≤ 1 mot avant) dans cet ensemble de
// négateurs. Dupliqué plutôt qu'importé : check-no-promise.mjs est hors périmètre pour cette
// tâche (on ne le modifie pas) et n'exporte pas ces deux éléments ; garder le même
// comportement plutôt qu'en inventer un autre.
const NEGATIONS = new Set([
  'kein', 'keine', 'keinen', 'keinem', 'keiner', 'ohne', 'nicht',
  'aucun', 'aucune', 'sans', 'no', 'without', 'never',
]);
function precedingWord(text, index) {
  const before = text.slice(0, index).trimEnd();
  const m = before.match(/([\p{L}\p{N}]+)\s*$/u);
  return m ? m[1] : '';
}

/**
 * findViolations(file, html) -> { file, rule, match }[]
 * Une entrée par règle déclenchée (première correspondance non négée), plus 'exclamation'
 * si le texte visible contient un point d'exclamation. `vouvoiement` est ignorée sur les
 * 4 chemins légaux (VOUVOIEMENT_EXEMPT_PATHS).
 */
export function findViolations(file, html) {
  const lower = textOf(html).toLowerCase();
  const out = [];
  for (const [rule, patterns] of Object.entries(LEXICON)) {
    if (rule.startsWith('$')) continue;
    if (rule === 'vouvoiement' && isVouvoiementExempt(file)) continue;
    let match = null;
    for (const p of patterns) {
      const re = new RegExp(p, 'g');
      let m;
      while ((m = re.exec(lower))) {
        if (!NEGATIONS.has(precedingWord(lower, m.index))) { match = m[0]; break; }
      }
      if (match) break;
    }
    if (match) out.push({ file, rule, match });
  }
  if (lower.includes('!')) out.push({ file, rule: 'exclamation', match: '!' });
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = resolve(here, '../dist');
  const errs = [];
  for (const file of listHtml(dist)) {
    const rel = file.slice(dist.length);
    for (const v of findViolations(rel, readFileSync(file, 'utf8'))) {
      errs.push(`${v.rule}: « ${v.match} » — dist${rel} (voir app/docs/brand/VOIX.md §08)`);
    }
  }
  report(errs, 'check-voice');
}
