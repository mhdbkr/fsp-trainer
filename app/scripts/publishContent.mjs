// app/scripts/publishContent.mjs — publie le contenu validé par la CI vers content_items
import { createClient } from '@supabase/supabase-js';
import { loadAll } from './loadCases.mjs';   // rend { cases, fachwissen, muster }
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const dry = process.argv.includes('--dry');
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dry && (!url || !key)) { console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis'); process.exit(2); }

// Les seeds sont du TS : on les transpile à la volée avec esbuild (déjà dépendance
// de Vite), par son API — pas par `npx … --outfile=/dev/stdout`, qui passait en
// local mais échouait muettement sur le runner Linux de la CI.
const load = async (rel) => {
  const r = await build({ entryPoints: [`src/data/${rel}`], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error' });
  return import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`);
};

const { cases, fachwissen: fw, muster } = await loadAll();
const auf = (await load('seedAufklaerungen.ts')).seedAufklaerungen();
const guides = (await load('seedGuides.ts')).seedGuides();
const fbRaw = JSON.parse(readFileSync('src/data/fachbegriffe.json', 'utf8'));
// Même mapping que seedFachbegriffe() — le payload doit être l'objet Fachbegriff, pas la ligne compacte.
const fb = fbRaw.map((r) => ({ id: r.id, term: r.t, translationSimple: r.s, definitionDetailed: r.def, pronunciation: r.p, specialty: r.sp, pathologyTags: r.tags ?? [], centers: r.c, linkedCaseIds: [], sp: r.sp }));

// Tier des contenus DÉRIVÉS : le Free est un échantillon COMPLET (12 cas avec
// leur fiche, leurs termes, leurs Aufklärungen), pas un catalogue de fiches
// offert. Règle : tier minimal des cas qui référencent l'item ; aucun cas Free
// → Pro. Les guides restent Free : questions génériques, sans contenu clinique.
const freeCases = cases.filter((c) => c.tier === 1);
const freePathologies = new Set(freeCases.map((c) => c.pathology));
const freeAuf = new Set(freeCases.flatMap((c) => c.probableAufklaerungIds ?? []));
const freeSpecialties = new Set(freeCases.map((c) => c.specialty));
const tierFw  = (f) => (freePathologies.has(f.pathology) ? 1 : 2);
const tierAuf = (a) => (freeAuf.has(a.id) ? 1 : 2);
// Fachbegriffe : le JSON n'a PAS de pathologyTags (vérifié : 0/2266) ; la
// liaison réelle est la SPÉCIALITÉ (`sp`). Free = 'Allgemein' (vocabulaire de
// base, 1 204 termes) + spécialités ayant au moins un cas Free ; sinon Pro.
// Fachbegriffe : Free = 'Allgemein' (vocabulaire de base, ~1 200 termes) ; les
// termes de SPÉCIALITÉ suivent le Pro. Une règle « spécialité ayant un cas
// Free » ouvrait 91 % du glossaire (12 cas couvrent 11 spécialités) — pas
// l'esprit de l'échantillon complet, qui porte sur les CAS et leur fiche.
const tierFb  = (b) => (b.sp === 'Allgemein' ? 1 : 2);

const items = [
  ...cases.map((c) => ({ id: c.id, kind: 'case', tier: c.tier ?? 2, payload: c })),
  ...fw.map((f) => ({ id: f.id, kind: 'fachwissen', tier: tierFw(f), payload: f })),
  ...auf.map((a) => ({ id: a.id, kind: 'aufklaerung', tier: tierAuf(a), payload: a })),
  ...guides.map((g) => ({ id: g.id, kind: 'guide', tier: 1, payload: g })),
  ...fb.map(({ sp, ...b }) => ({ id: b.id, kind: 'fachbegriff', tier: tierFb({ sp }), payload: b })),
  ...Object.entries(muster).map(([caseId, m]) => ({ id: `muster-${caseId}`, kind: 'muster', tier: (cases.find((c) => c.id === caseId)?.tier ?? 2), payload: m })),
];
const byKind = items.reduce((a, i) => ((a[i.kind] = (a[i.kind] ?? 0) + 1), a), {});
const free = (k) => items.filter((i) => i.kind === k && i.tier === 1).length;
console.log('items :', byKind, '| Free → cas', free('case'), '· fiches', free('fachwissen'), '· Aufklärungen', free('aufklaerung'), '· termes', free('fachbegriff'));
if (dry) process.exit(0);

const sb = createClient(url, key, { auth: { persistSession: false } });
import { createHash } from 'node:crypto';
// Hash CANONIQUE : jsonb réordonne les clés et normalise les nombres — un
// JSON.stringify brut différerait toujours entre ce qu'on envoie et ce qu'on relit.
const canon = (v) => Array.isArray(v) ? v.map(canon)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
  : typeof v === 'number' ? Number(v) : v;
const hash = (o) => createHash('sha256').update(JSON.stringify(canon(o))).digest('hex').slice(0, 16);

// Lecture PAGINÉE de l'existant (PostgREST plafonne à 1 000) : id, tier et hash du payload.
const existing = new Map();
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('content_items').select('id, tier, deleted, payload').range(from, from + 999);
  if (error) throw error;
  for (const r of data ?? []) existing.set(r.id, { tier: r.tier, deleted: r.deleted, hash: hash(r.payload) });
  if (!data || data.length < 1000) break;
}
// Seuls les items NOUVEAUX ou MODIFIÉS (payload, tier) prennent la nouvelle version :
// republier tout forcerait chaque client à retélécharger le catalogue à chaque push.
const changed = items.filter((it) => { const e = existing.get(it.id); return !e || e.deleted || e.tier !== it.tier || e.hash !== hash(it.payload); });
const ids = new Set(items.map((i) => i.id));
const gone = [...existing.entries()].filter(([id, e]) => !ids.has(id) && !e.deleted).map(([id]) => id);
if (!changed.length && !gone.length) { console.log('rien à publier — contenu identique'); process.exit(0); }

const { data: last } = await sb.from('content_versions').select('version').order('version', { ascending: false }).limit(1).maybeSingle();
const version = (last?.version ?? 0) + 1;
const { error: ve } = await sb.from('content_versions').insert({ version, notes: process.env.GITHUB_SHA ?? 'local' });
if (ve) throw ve;
for (let i = 0; i < changed.length; i += 200) {
  const { error } = await sb.from('content_items').upsert(changed.slice(i, i + 200).map((it) => ({ ...it, version, deleted: false })));
  if (error) throw error;
}
if (gone.length) {
  const { error } = await sb.from('content_items').update({ deleted: true, version }).in('id', gone);
  if (error) throw error;
}
console.log(`✅ version ${version} publiée — ${changed.length} modifiés/nouveaux, ${gone.length} supprimés (${items.length} au total)`);
