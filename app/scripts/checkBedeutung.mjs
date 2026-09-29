// ============================================================================
// Invariant CI (F4a §3.2) : la Bedeutung (`s`) d'un terme lié à un cas est une
// reformulation directe et retenable — ≤ 6 mots, jamais une phrase de
// définition (la définition vit dans `def`, affichée repliée).
// Usage :
//   node scripts/checkBedeutung.mjs            → exit 1 si un terme lié est signalé
//   node scripts/checkBedeutung.mjs --list     → JSON des termes signalés (brief d'auteur)
//   node scripts/checkBedeutung.mjs apply <patch.json>   ({ id: "nouvelle Bedeutung" } ; tout ou rien)
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const MAX_WORDS = 6;
const DEFINITION = /[.;]\s*$|(?<![\p{L}])(ist|sind|wird|werden|bezeichnet|bedeutet)(?![\p{L}])|,\s*(der|die|das|welche[rsnm]?)(?![\p{L}])/iu;

/** Motif du signalement, ou null si la Bedeutung est conforme. */
export function bedeutungIssue(s) {
  const t = String(s ?? '').trim();
  if (!t) return 'vide';
  if (t.split(/\s+/).length > MAX_WORDS) return `> ${MAX_WORDS} mots`;
  if (DEFINITION.test(t)) return 'phrase de définition';
  return null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const here = dirname(fileURLToPath(import.meta.url));
  const fbPath = join(here, '../src/data/fachbegriffe.json');
  const fb = JSON.parse(readFileSync(fbPath, 'utf8'));
  const linked = new Set(Object.values(JSON.parse(readFileSync(join(here, '../src/data/caseTermLinks.json'), 'utf8'))).flat());
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'apply') {
    const patch = JSON.parse(readFileSync(arg, 'utf8'));
    const byId = new Map(fb.map((e) => [e.id, e]));
    let bad = 0;
    for (const [id, s] of Object.entries(patch)) {
      const why = !byId.has(id) ? 'id inconnu' : bedeutungIssue(s);
      if (why) { console.error(`✗ ${id} : ${why} (« ${s} »)`); bad++; }
    }
    if (bad) { console.error(`❌ ${bad} entrée(s) refusée(s) — rien écrit`); process.exit(1); }
    for (const [id, s] of Object.entries(patch)) byId.get(id).s = s.trim();
    const { serialize } = await import('./registerLots.mjs');
    writeFileSync(fbPath, serialize(fb));
    console.log(`✓ ${Object.keys(patch).length} Bedeutungen appliquées`);
  } else {
    const flagged = fb.filter((e) => linked.has(e.id) && bedeutungIssue(e.s));
    if (cmd === '--list') { console.log(JSON.stringify(flagged.map((e) => ({ id: e.id, t: e.t, s: e.s, why: bedeutungIssue(e.s), def: e.def, sp: e.sp })), null, 2)); process.exit(0); }
    for (const e of flagged) console.error(`✗ ${e.id} « ${e.t} » : ${bedeutungIssue(e.s)} — « ${e.s} »`);
    if (flagged.length) { console.error(`❌ ${flagged.length} Bedeutung(en) à reformuler (sur ${linked.size} termes liés)`); process.exit(1); }
    console.log(`✓ Bedeutung : ${linked.size} termes liés, toutes ≤ ${MAX_WORDS} mots`);
  }
}
