// Foyer commun des validateurs qui lisent le HTML construit (check-voice, check-no-promise,
// check-legal, check-cta, check-lighthouse, test/seo-meta).
//
// Trois questions y sont tranchées UNE fois, pour tous :
//  1. dépouillement + décodage du HTML  -> stripTags / decodeEntities / stripInvisible / textOf
//  2. frontières de mot                 -> boundedRe (bornes Unicode, drapeau `u`)
//  3. étendue du corpus d'une page      -> htmlCorpus (scope 'basic' | 'full')
// Deux implémentations divergentes de la même règle dans deux validateurs voisins est la
// dette réelle : tout ajout de règle se fait ici, pas dans un validateur.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Un test sauté se lit comme un test vert. Les quatre fichiers qui lisent `dist/` portaient
// un `skip` si le build manquait : la suite annonçait « 0 skipped » quand dist existait et
// sautait six assertions en silence quand il manquait. Ils appellent désormais ceci au
// chargement — le fichier échoue avec la consigne, et `npm run verify` construit d'abord.
export function requireBuilt(...files) {
  const missing = files.filter((f) => !existsSync(f));
  if (missing.length) {
    throw new Error(`dist/ absent — lance « npm run build » avant « npm test » (npm run verify le fait dans cet ordre). Manque : ${missing.join(', ')}`);
  }
}

export function listHtml(dir) {
  const out = [];
  for (const e of readdirSync(dir)) { const p = join(dir, e); if (statSync(p).isDirectory()) out.push(...listHtml(p)); else if (e.endsWith('.html')) out.push(p); }
  return out.sort();
}

// Entités nommées courantes d'un site allemand + les formes numériques (&#252; / &#xFC;).
// Écrit à la main : aucune dépendance hors bibliothèque standard (contrainte de la tâche).
// Sans ce décodage, une seule entité d'umlaut (« Pr&uuml;fungsfragen ») neutralise les
// motifs de la moitié des règles.
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '­',
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
  agrave: 'à', eacute: 'é', egrave: 'è', ecirc: 'ê', ccedil: 'ç', ugrave: 'ù',
  excl: '!', quest: '?', sol: '/', colon: ':', semi: ';', commat: '@', num: '#',
  hellip: '…', ndash: '–', mdash: '—', minus: '−', times: '×', middot: '·', bull: '•',
  laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”', sbquo: '‚', lsquo: '‘', rsquo: '’',
  euro: '€', copy: '©', reg: '®', trade: '™', deg: '°', percnt: '%', plus: '+', equals: '=',
  thinsp: ' ', ensp: ' ', emsp: ' ', zwnj: '‌', zwj: '‍',
};
const ENTITY_RE = /&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});/g;
export function decodeEntities(s) {
  return s.replace(ENTITY_RE, (m, body) => {
    if (body[0] !== '#') return Object.hasOwn(NAMED, body) ? NAMED[body] : m;
    const cp = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    if (!Number.isInteger(cp) || cp < 1 || cp > 0x10ffff) return m;
    return String.fromCodePoint(cp);
  });
}

// Césure conditionnelle et largeurs nulles : « Prü&shy;fungs&shy;fragen » est la césure
// typographique normale d'un composé allemand — aussi probable par accident que par malice.
const INVISIBLE_RE = /[­​‌‍⁠﻿]/g;
export function stripInvisible(s) { return s.replace(INVISIBLE_RE, ''); }

// Dépouillement des balises. `<[^>]+>` casse sur un `>` dans une valeur d'attribut
// (`data-x="a > lernen b"` laissait « lernen » dans le texte visible) : on consomme les
// valeurs entre guillemets, qui peuvent contenir `>`. Un `<` de prose (« a < b ») n'est
// plus pris pour une balise (il faut une lettre, `!`, `/` ou `?` juste après).
const COMMENT_RE = /<!--[\s\S]*?-->/g;
const TAG_RE = /<[a-zA-Z!/?][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/g;
export function stripTags(html) {
  return html.replace(COMMENT_RE, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(TAG_RE, ' ');
}

// Texte visible d'une page : ni script, ni style, ni commentaire, ni attribut.
// LIMITE CONNUE : un mot coupé par une balise inline (`<strong>lern</strong>en`) devient
// « lern en » et échappe aux motifs. Recoller les fragments créerait l'inverse (souder
// « Wort</p><p>Wort »), donc on ne devine pas : la limite est documentée, et une coupure
// volontaire se sanctionne par le mécanisme d'exception explicite (voir collectAllow).
export function textOf(html) {
  return stripInvisible(decodeEntities(stripTags(html))).replace(/\s+/g, ' ').trim();
}

// Frontières de mot en bornes Unicode. `\b` est ASCII : il matche entre « s » et « ü »,
// donc « Kursübersicht » déclenchait `kurs` et « Bürette » déclenchait `rette`.
// Le motif est encapsulé en `(?:…)` pour qu'une alternance de premier niveau reste bornée.
export function boundedRe(pattern, flags = 'gu') {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, flags);
}

// Exception explicite, dans la source : `<!-- voice:allow "texte exact" -->`. Une exception
// écrite dans le texte se voit dans un diff ; une heuristique, non.
// PORTÉE (tranchée ici pour les deux portes, check-voice et check-no-promise) : une
// correspondance n'est levée que si elle tombe À L'INTÉRIEUR d'une occurrence de ce texte
// exact sur la page. Un mot nu (« Streak ») ne couvre que ce mot ; une PHRASE ne couvre que
// les mots qu'elle contient, là où elle apparaît. Avant, l'exception comparait le mot trouvé
// au texte de l'exception : « Erfolgsgarantie », posé pour l'avertissement légal qui NIE la
// garantie, levait aussi « Mit Erfolgsgarantie zur bestandenen Prüfung. » sur la même page.
// Les blancs sont réduits à un espace, comme dans textOf.
const ALLOW_RE = /<!--\s*voice:allow\s*"([^"]*)"\s*-->/g;
export function collectAllow(raw) { return [...raw.matchAll(ALLOW_RE)].map((m) => m[1].replace(/\s+/g, ' ').trim()); }

// `hay` et `phrases` sont normalisés par l'appelant, avec SA normalisation (chaque porte a la
// sienne) : les positions [start, end) de la correspondance sont celles de `hay`.
export function allowCovers(hay, phrases, start, end) {
  for (const p of phrases) {
    if (!p) continue;
    for (let i = hay.indexOf(p); i !== -1 && i <= start; i = hay.indexOf(p, i + 1)) {
      if (end <= i + p.length) return true;
    }
  }
  return false;
}

export function htmlTitle(html) { return (html.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1]; }

// `<meta name="…" content="…">` ou `<meta property="…" content="…">`, dans les deux ordres.
export function metaContent(html, key) {
  const k = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (html.match(new RegExp(`<meta[^>]*\\b(?:name|property)="${k}"[^>]*\\bcontent="([^"]*)"`, 'i'))
    || html.match(new RegExp(`<meta[^>]*\\bcontent="([^"]*)"[^>]*\\b(?:name|property)="${k}"`, 'i'))
    || [, ''])[1];
}

export function imgAlts(html) { return [...html.matchAll(/<img[^>]+\balt="([^"]*)"/gi)].map((m) => m[1]); }

// Attributs que l'utilisateur lit vraiment (lecteur d'écran, infobulle, image manquante).
export function attrTexts(html, names = ['alt', 'title', 'aria-label']) {
  const out = [];
  for (const n of names) {
    for (const m of html.matchAll(new RegExp(`\\s${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'gi'))) out.push(m[1] ?? m[2] ?? '');
  }
  return out;
}

export function jsonStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) jsonStrings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) jsonStrings(v, out);
  return out;
}

// Les blocs `application/ld+json` portent les réponses de la FAQ et les descriptions du
// blog : dépouillés avec les `<script>`, ils échappaient à toute règle.
export function jsonLdStrings(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { jsonStrings(JSON.parse(m[1]), out); } catch { out.push(m[1]); }
  }
  return out;
}

/**
 * htmlCorpus(html, scope) -> { text, allow }
 *  'basic' — texte visible + <title> + meta description + alt des <img> (étendue historique
 *            de check-no-promise : sa porte de CI ne change pas de comportement).
 *  'full'  — + og:description + attributs lus par l'utilisateur (alt/title/aria-label)
 *            + chaînes des blocs application/ld+json. La copie que Google affiche et que
 *            le lecteur d'écran lit compte autant que le corps de la page.
 */
export function htmlCorpus(html, scope = 'basic') {
  const parts = [textOf(html), htmlTitle(html), metaContent(html, 'description'), ...imgAlts(html)];
  if (scope === 'full') parts.push(metaContent(html, 'og:description'), ...attrTexts(html), ...jsonLdStrings(html));
  return { text: parts.join('\n'), allow: collectAllow(html) };
}

export function report(errs, label) {
  if (errs.length) { for (const e of errs) console.error(`✗ ${e}`); console.error(`✗ ${label}: ${errs.length} manquement(s)`); process.exitCode = 1; }
  else console.log(`✓ ${label}`);
}
