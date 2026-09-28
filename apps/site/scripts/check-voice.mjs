#!/usr/bin/env node
// Vérifie la voix de marque (app/docs/brand/VOIX.md §08, PHILOSOPHIE.md §08) sur le HTML
// construit. Les briques (dépouillement, décodage d'entités, césure, bornes Unicode,
// étendue du corpus, exception explicite) viennent de lib/dist.mjs — le même foyer que
// check-no-promise.mjs, check-legal.mjs et check-cta.mjs.
//
// CORPUS (scope 'full' de htmlCorpus) : texte visible + <title> + meta description +
// og:description + attributs lus par l'utilisateur (alt/title/aria-label) + chaînes des
// blocs application/ld+json. La copie que Google affiche et que le lecteur d'écran lit
// compte autant que le corps de la page.
//
// COMPARAISON : entités décodées (&uuml; / &#252; / &#xFC;), césure conditionnelle et
// largeurs nulles retirées, NFC, minuscules. Les diacritiques sont CONSERVÉS — les
// dépouiller casserait les motifs à umlaut du lexique.
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
//  urgence                VOIX.md §08 — l'urgence fabriquée ; le seul compte à rebours légitime est sa date d'examen
//  comparaison            VOIX.md §08 — la comparaison nommée : on décrit ce que l'alternative ne peut pas faire
//  metaphore_explicitee   PHILOSOPHIE.md §08 — la métaphore de la pieuvre ne s'explique jamais
//  sauvetage              PHILOSOPHIE.md §08 — aucun sauvetage, aucune noyade, aucune tempête
//  bareme                 confidentialité du barème exact (60 % / 60 points)
//  autorite_evaluation    toute affirmation sur la FSP doit être sourcée, et l'évaluation affichée
//                          est la grille d'ENTRAÎNEMENT de Doctopus, jamais le barème d'une chambre.
//                          ATTRAPE : une action d'évaluation prêtée aux examinateurs (« die Prüfer
//                          einzeln bewerten », « bewertet vom Prüfer ») et un barème qualifié
//                          d'officiel ou attribué à la chambre (« offizielles Bewertungsraster »,
//                          « den Bogen deiner Kammer »). LAISSE PASSER : « am Prüfungstag », « die
//                          Prüfung besteht aus drei Teilen », « So bewerten wir im Trainer », et
//                          « kein offizielles Prüfungsergebnis » (avertissement de ExamFacts.astro —
//                          `Prüfungsergebnis` n'est pas dans la liste). Portée et non-portée écrites
//                          en entier dans $decisions de voice.lexicon.json.
//  exclamation            VOIX.md §05 — zéro point d'exclamation en allemand public (variantes Unicode incluses)
//  emoji                  VOIX.md §08 — aucun émoji dans le corps d'un texte allemand
//
// EXCEPTION : pas d'heuristique de négation (elle échouait des deux côtés : elle n'absorbait
// pas « keine strafende Streak » et elle avalait « ohne im ersten Versuch zu scheitern »).
// Une exception se pose à la main dans la source, en commentaire HTML :
//     <!-- voice:allow "keine strafende Streak" -->
// Elle lève les correspondances qui tombent DANS une occurrence de ce texte exact, sur CETTE
// page seulement, pour toutes les règles (portée : lib/dist.mjs, allowCovers). Qu'on y mette
// la phrase entière, pas le mot : un mot nu couvre toutes ses occurrences de la page. Une exception écrite dans le texte se voit dans un diff ; une heuristique, non.
// C'est aussi la seule sanction possible d'un mot volontairement coupé par une balise inline
// (limite documentée dans lib/dist.mjs, textOf).
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listHtml, htmlCorpus, decodeEntities, stripInvisible, boundedRe, allowCovers, report } from './lib/dist.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const LEXICON = JSON.parse(readFileSync(join(here, 'voice.lexicon.json'), 'utf8'));

// Arbitrage tâche 5, réserve n°1 (retenue) : le vouvoiement est l'usage juridique allemand, et
// une Widerrufsbelehrung porte des formules statutaires qu'on ne réécrit pas au tutoiement.
// Seule la règle `vouvoiement` est levée, et seulement sur ces 4 chemins EXACTS — une
// comparaison en sous-chaîne offrirait l'exemption à /de/agb/anhang/ et à toute machine dont
// le chemin de checkout contiendrait « de/agb ».
const VOUVOIEMENT_EXEMPT_PATHS = ['/de/agb/', '/de/datenschutz/', '/de/widerruf/', '/de/impressum/'];
const isVouvoiementExempt = (file) => VOUVOIEMENT_EXEMPT_PATHS.includes(file.replace(/[^/]*$/, ''));

// Règles de caractère : un jeu de caractères, pas un motif de mot (les bornes de mot n'ont
// pas de sens ici — « toll🎉 » doit déclencher autant que « toll 🎉 »).
const CHAR_RULES = {
  // « ！ » pleine largeur (U+FF01) et ses parents passaient : la règle testait '!' en ASCII.
  exclamation: /[!！﹗ǃ‼⁉❕❗]/u,
  // Emoji_Presentation + pictogramme suivi du sélecteur de variante : attrape 🐙 et ❤️
  // sans attraper le © du pied de page (pictogramme sans présentation émoji).
  emoji: /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u,
};

const normalizeVoice = (s) => stripInvisible(decodeEntities(s)).normalize('NFC').toLowerCase();

/**
 * findViolations(file, html, lexicon) -> { file, rule, match }[]
 * Une entrée par règle déclenchée (première correspondance non exemptée). `file` est le
 * chemin RELATIF à dist/ (« /de/agb/index.html ») : les exemptions de chemin en dépendent.
 * `lexicon` n'est surchargé que par les tests (motif capable de matcher le vide).
 */
export function findViolations(file, html, lexicon = LEXICON) {
  const { text, allow } = htmlCorpus(html, 'full');
  const hay = normalizeVoice(text);
  const allowed = allow.map(normalizeVoice);
  const out = [];
  for (const [rule, patterns] of Object.entries(lexicon)) {
    if (rule.startsWith('$')) continue;
    if (rule === 'vouvoiement' && isVouvoiementExempt(file)) continue;
    let match = null;
    for (const p of patterns) {
      const re = boundedRe(p);
      let m;
      while ((m = re.exec(hay))) {
        // Un motif capable de matcher le vide ferait tourner exec() à l'infini (la CI
        // bloquerait) : on avance la tête de lecture à la main.
        if (m[0].length === 0) { re.lastIndex += 1; continue; }
        if (!allowCovers(hay, allowed, m.index, m.index + m[0].length)) { match = m[0]; break; }
      }
      if (match) break;
    }
    if (match) out.push({ file, rule, match });
  }
  // Toutes les occurrences, pas la première : une exception qui couvre la première ne doit
  // pas faire passer les suivantes.
  for (const [rule, re] of Object.entries(CHAR_RULES)) {
    for (const m of hay.matchAll(new RegExp(re.source, 'gu'))) {
      if (!allowCovers(hay, allowed, m.index, m.index + m[0].length)) { out.push({ file, rule, match: m[0] }); break; }
    }
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // argv[2] : racine du corpus (défaut ../dist). Sert à exercer la moitié exécutable —
  // parcours, forme du chemin rapporté, code de sortie — sur un dist/ minimal.
  const dist = process.argv[2] ? resolve(process.argv[2]) : resolve(here, '../dist');
  const files = existsSync(dist) ? listHtml(dist) : [];
  const errs = [];
  // Un dist/ présent mais sans HTML donnait un succès à vide, sortie 0 : une porte qui ne
  // scanne rien n'est pas verte, elle est muette.
  if (!files.length) errs.push(`corpus vide : aucun fichier HTML sous ${dist}`);
  for (const file of files) {
    const rel = file.slice(dist.length);
    for (const v of findViolations(rel, readFileSync(file, 'utf8'))) {
      errs.push(`${v.rule}: « ${v.match} » — dist${rel} (voir app/docs/brand/VOIX.md §08)`);
    }
  }
  report(errs, 'check-voice');
}
