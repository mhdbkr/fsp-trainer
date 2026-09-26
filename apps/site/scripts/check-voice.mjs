#!/usr/bin/env node
// Vérifie la voix de marque (app/docs/brand/VOIX.md §08, PHILOSOPHIE.md §08)
// sur le HTML construit. Ne lit que le TEXTE VISIBLE : ni attributs, ni script, ni style
// (réutilise textOf/listHtml de lib/dist.mjs, comme check-no-promise.mjs et check-legal.mjs).
//
// README des règles (voice.lexicon.json) :
//  vouvoiement            VOIX.md §01/§08 — une seule personne grammaticale (tutoiement), jamais de Sie
//  scolaire               VOIX.md §08 — vocabulaire scolaire : on n'enseigne pas à un médecin
//  hype                   VOIX.md §08 — l'IA comme argument, le superlatif générique
//  promesse               VOIX.md §08 — toute forme de promesse de réussite
//  fuite                  confidentialité de l'examen : ne jamais laisser croire à un accès aux sujets
//  jeu                    VOIX.md §08 — jargon de jeu en façade (les mécaniques existent, le discours n'en parle pas)
//  metaphore_explicitee   PHILOSOPHIE.md §08 — la métaphore de la pieuvre ne s'explique jamais
//  sauvetage              PHILOSOPHIE.md §08 — aucun sauvetage, aucune noyade, aucune tempête
//  bareme                 confidentialité du barème exact (60 % / 60 points)
//  exclamation            VOIX.md §05 — zéro point d'exclamation en allemand public
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listHtml, textOf, report } from './lib/dist.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const LEXICON = JSON.parse(readFileSync(join(here, 'voice.lexicon.json'), 'utf8'));

/**
 * findViolations(file, html) -> { file, rule, match }[]
 * Une entrée par règle déclenchée (première correspondance), plus 'exclamation'
 * si le texte visible contient un point d'exclamation.
 */
export function findViolations(file, html) {
  const lower = textOf(html).toLowerCase();
  const out = [];
  for (const [rule, patterns] of Object.entries(LEXICON)) {
    if (rule.startsWith('$')) continue;
    for (const p of patterns) {
      const m = lower.match(new RegExp(p));
      if (m) { out.push({ file, rule, match: m[0] }); break; }
    }
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
