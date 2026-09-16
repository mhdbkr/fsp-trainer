#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listHtml, textOf, report } from './lib/dist.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const LEGAL = ['impressum', 'datenschutz', 'agb', 'widerruf'];

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
    if (/<meta http-equiv="refresh"/i.test(html)) continue; // stub de redirection Astro (ex. / → /de/), pas une page de contenu
    const footer = (html.match(/<footer[\s\S]*?<\/footer>/i) || [''])[0];
    const rel = file.slice(dist.length);
    if (!textOf(footer).includes(notice)) errs.push(`${rel}: avertissement outil de langue absent du footer`);
    if (!/data-notice="language-tool"/.test(footer)) errs.push(`${rel}: [data-notice="language-tool"] absent du footer`);
    for (const l of LEGAL) if (!new RegExp(`href="/de/${l}/"`).test(footer)) errs.push(`${rel}: lien /de/${l}/ absent du footer`);
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
    const draft = data.validated_by === '';
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
