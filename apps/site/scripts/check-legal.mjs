#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listHtml, textOf, boundedRe, report } from './lib/dist.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const LEGAL = ['impressum', 'datenschutz', 'agb', 'widerruf'];

// ─── Correction de revue (C3) : la porte qui manquait ───
// Le corps Markdown de docs/legal/*.md porte des notes de rédaction internes, en français.
// `LegalPage.astro` ne les rend plus (bloc `<!-- legal:internal -->…`, forme en ligne
// `{{"…"}}`), mais un gabarit sans porte n'est qu'une intention : la note suivante
// repartirait en production sans que rien ne rougisse. Ces trois règles ferment la cause.
//
// MARQUEUR / RÉSIDU — sur le HTML BRUT : un marqueur ou un `{{"` qui survit signifie que
// le retrait n'a pas eu lieu, même si le texte visible paraît propre.
const NOTE_MARKER = /legal:internal/i;
const NOTE_RESIDUE = /\{\{\s*[“”"]/;
// Un nom de fichier interne rendu au lecteur est une note qui a survécu sous un autre
// masque : `siehe disclaimer.md`, `PRODUCT-VISION.md §7`, `README.md`. Le lecteur d'une
// Widerrufsbelehrung n'a pas de dépôt. Les pages légales nomment ce qu'il voit.
const INTERNAL_REF = /(?<![\p{L}\p{N}])[\w.-]+\.(?:md|mjs|ts|astro|sql)(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])(?:PRODUCT-VISION|ROADMAP-PRODUCTION|CONTEXT|ADR-\d+)(?![\p{L}\p{N}])/u;
//
// FRANÇAIS — sur le TEXTE VISIBLE (le HTML brut porte les commentaires FR volontaires des
// composants, qui ne sont pas rendus au lecteur). Deux jeux, deux seuils :
//  · le vocabulaire de note tranche seul — aucun de ces mots n'a de raison d'être publié ;
//  · les mots-outils demandent DEUX formes distinctes, parce qu'une seule peut appartenir à
//    un contenu légalement exigé (une forme juridique française dans l'Impressum :
//    « Société à responsabilité limitée » porte « à » sans être une note).
const FRENCH_NOTE = boundedRe('juriste|juristes|préciser|confirmer|trancher|biffer|valider|brouillon|placeholder');
const FRENCH_WORDS = boundedRe('à|aux|avec|dans|doit|doivent|être|est|selon|sont|pour|qui|que|cette|toute|leur|nous|vous|peut|sans|sous|entre|les|une|français|française');
const FRENCH_MIN_DISTINCT = 2;

function frenchHits(text) {
  const note = [...new Set([...text.matchAll(FRENCH_NOTE)].map((m) => m[0].toLowerCase()))];
  const words = [...new Set([...text.matchAll(FRENCH_WORDS)].map((m) => m[0].toLowerCase()))];
  if (note.length) return note.concat(words);
  return words.length >= FRENCH_MIN_DISTINCT ? words : [];
}

function shortDisclaimer(legalDir) {
  const md = readFileSync(join(legalDir, 'disclaimer.md'), 'utf8');
  const m = md.match(/^## Version courte pour le footer \(DE\)\s*\n([\s\S]*?)(?=^## )/m);
  return m[1].replace(/\s+/g, ' ').trim();
}

export function checkLegal({ dist, legalDir, sitePublic }) {
  const errs = [];
  const notice = shortDisclaimer(legalDir);
  for (const l of LEGAL) if (!existsSync(join(dist, 'de', l, 'index.html'))) errs.push(`page légale absente : /de/${l}/`);
  for (const file of listHtml(dist)) {
    const html = readFileSync(file, 'utf8');
    const rel = file.slice(dist.length);
    if (rel === '/index.html' && /<meta http-equiv="refresh"/i.test(html)) continue; // stub de redirection Astro / → /de/ uniquement
    const footer = (html.match(/<footer[\s\S]*?<\/footer>/i) || [''])[0];
    if (!textOf(footer).includes(notice)) errs.push(`${rel}: avertissement outil de langue absent du footer`);
    if (!/data-notice="language-tool"/.test(footer)) errs.push(`${rel}: [data-notice="language-tool"] absent du footer`);
    for (const l of LEGAL) if (!new RegExp(`href="/de/${l}/"`).test(footer)) errs.push(`${rel}: lien /de/${l}/ absent du footer`);
    if (NOTE_MARKER.test(html)) errs.push(`${rel}: marqueur de note interne rendu (legal:internal)`);
    if (NOTE_RESIDUE.test(html)) errs.push(`${rel}: note interne rendue (résidu {{"…"}})`);
    const visible = textOf(html);
    const fr = frenchHits(visible);
    if (fr.length) errs.push(`${rel}: français rendu dans le texte visible — ${fr.slice(0, 6).join(', ')}`);
    const ref = visible.match(INTERNAL_REF);
    if (ref) errs.push(`${rel}: référence interne rendue au lecteur — ${ref[0]}`);
  }
  const home = readFileSync(join(dist, 'de', 'index.html'), 'utf8');
  const main = (home.match(/<main[\s\S]*?<\/main>/i) || [''])[0];
  if (!/data-notice="language-tool"/.test(main)) errs.push('/de/: avertissement absent de <main>');
  const preise = join(dist, 'de', 'preise', 'index.html');
  if (existsSync(preise)) {
    const t = textOf(readFileSync(preise, 'utf8'));
    if (!/MwSt/.test(t)) errs.push('/de/preise/: mention MwSt. absente');
    if (!/Widerruf/.test(t)) errs.push('/de/preise/: mention du Widerrufsrecht absente');
  }
  for (const l of LEGAL) {
    const { data } = parseFrontmatter(readFileSync(join(legalDir, `${l}.md`), 'utf8'));
    if (!data) { errs.push(`docs/legal/${l}.md: front-matter absent`); continue; }
    const page = existsSync(join(dist, 'de', l, 'index.html')) ? readFileSync(join(dist, 'de', l, 'index.html'), 'utf8') : '';
    const draft = !data.validated_by;
    if (draft && !/data-legal-status="draft"/.test(page)) errs.push(`/de/${l}/: bannière Entwurf attendue (validated_by vide)`);
    if (!draft && /data-legal-status="draft"/.test(page)) errs.push(`/de/${l}/: bannière Entwurf présente alors que validated_by est renseigné`);
    if (sitePublic && l === 'impressum' && draft) errs.push('SITE_PUBLIC=true exige validated_by non vide sur impressum.md');
  }
  return errs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errs = checkLegal({ dist: resolve(here, '../dist'), legalDir: resolve(here, '../../../docs/legal'), sitePublic: process.env.SITE_PUBLIC === 'true' });
  report(errs, 'check-legal');
}
