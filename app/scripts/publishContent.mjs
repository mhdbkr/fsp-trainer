// app/scripts/publishContent.mjs — publie le contenu validé par la CI vers content_items
import { createClient } from '@supabase/supabase-js';
import { loadAll } from './loadCases.mjs';   // rend { cases, fachwissen, muster }
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const dry = process.argv.includes('--dry');
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dry && (!url || !key)) { console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis'); process.exit(2); }

// Les seeds sont du TS : on les transpile à la volée avec esbuild (déjà dépendance de Vite).
const load = (rel) => { const out = execSync(`npx esbuild src/data/${rel} --bundle --format=esm --platform=node --outfile=/dev/stdout --log-level=silent`, { encoding: 'utf8', maxBuffer: 64e6 }); return import(`data:text/javascript;base64,${Buffer.from(out).toString('base64')}`); };

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
const tierFb  = (b) => (b.sp === 'Allgemein' || freeSpecialties.has(b.sp) ? 1 : 2);

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
const { data: last } = await sb.from('content_versions').select('version').order('version', { ascending: false }).limit(1).maybeSingle();
const version = (last?.version ?? 0) + 1;
const { error: ve } = await sb.from('content_versions').insert({ version, notes: process.env.GITHUB_SHA ?? 'local' });
if (ve) throw ve;
// upsert par lots ; les items disparus sont marqués deleted
const ids = new Set(items.map((i) => i.id));
// kind/payload sont NOT NULL en base : on les reporte tels quels pour les lignes
// qu'on marque seulement `deleted` (l'upsert ne doit pas violer le schéma).
const { data: existing } = await sb.from('content_items').select('id, kind, payload').eq('deleted', false);
const gone = (existing ?? []).filter((e) => !ids.has(e.id)).map((e) => ({ id: e.id, kind: e.kind, payload: e.payload, deleted: true, version }));
for (let i = 0; i < items.length; i += 200) {
  const { error } = await sb.from('content_items').upsert(items.slice(i, i + 200).map((it) => ({ ...it, version, deleted: false })));
  if (error) throw error;
}
if (gone.length) { const { error } = await sb.from('content_items').upsert(gone); if (error) throw error; }
console.log(`✅ version ${version} publiée — ${items.length} items, ${gone.length} supprimés`);
