// app/scripts/checkTermLabels.mjs
// Invariant CI : un libellé de Fachbegriff est un terme, pas une note d'édition.
//  - `t` sans parenthèse ni crochet — sauf un acronyme final, « Elektrokardiogramm (EKG) » —,
//    sans « ! », « ? » ni « : » final (« Pleura (2) », « Androgene (pl.) », « cave! »).
//  - `t` n'est le `s` d'aucune autre entrée : le mot patient d'un terme n'est pas
//    lui-même un Fachbegriff (Myokardinfarkt.s = « Herzinfarkt » ⇒ pas d'entrée « Herzinfarkt »).
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ACRONYM = /\s\([A-ZÄÖÜ]{2,6}\)$/;
const norm = (x) => x.trim().toLowerCase();

export function checkLabel(t) {
  const errs = [];
  if (/[()[\]]/.test(t.replace(ACRONYM, ''))) errs.push('parenthèse technique');
  if (/[!?]|:\s*$/.test(t)) errs.push('ponctuation technique');
  return errs;
}

export function checkAll(fb) {
  const errs = [];
  const patientWord = new Map(fb.map((e) => [norm(e.s), e]));
  for (const e of fb) {
    for (const m of checkLabel(e.t)) errs.push(`${e.id} « ${e.t} » : ${m}`);
    const o = patientWord.get(norm(e.t));
    if (o && o !== e) errs.push(`${e.id} « ${e.t} » : mot patient de ${o.id} (« ${o.t} »), pas un Fachbegriff`);
  }
  return errs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const here = dirname(fileURLToPath(import.meta.url));
  const fb = JSON.parse(readFileSync(join(here, '../src/data/fachbegriffe.json'), 'utf8'));
  const errs = checkAll(fb);
  for (const m of errs) console.error(`✗ ${m}`);
  if (errs.length) { console.error(`❌ ${errs.length} libellé(s) refusé(s)`); process.exit(1); }
  console.log(`✓ ${fb.length} libellés propres`);
}
