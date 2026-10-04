// Tests de la mesure de cohérence (lot K0, ADR-0023). BLOQUANTS en CI, alors que
// `checkCoherence.mjs` lui-même est informatif (`|| true`) jusqu'à K3.
//   • la mesure (fonctions pures) : un constat, et la mutation qui le fait disparaître ;
//   • la porte (copie de travail, `mutationSandbox`) : lexique abîmé → rouge, plancher
//     dépassé → rouge, `--bless` refuse une hausse, la mesure LIT le lexique.
// Usage : node --test scripts/checkCoherence.test.mjs
import test, { after } from 'node:test';
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { sandbox } from './mutationSandbox.mjs';
import { mesurerCas, profilPropose, signesDe } from './coherenceMesure.mjs';

// ── La mesure : un lexique minimal, des trames de poche ──────────────────────
// La lecture du texte est CELLE du lexique (`symptomsInText`, symptoms.ts) : on la charge pour de vrai.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = await (async () => {
  const dir = mkdtempSync(join(tmpdir(), 'fsp-lire-'));
  try {
    writeFileSync(join(dir, 'e.ts'), `export { symptomsInText } from ${JSON.stringify(join(root, 'src/data/guides/symptoms.ts'))};`);
    await build({ entryPoints: [join(dir, 'e.ts')], outfile: join(dir, 'b.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
      plugins: [{ name: 'alias', setup(b) { b.onResolve({ filter: /^@\// }, (a) => ({ path: join(root, 'src', a.path.slice(2)) + (a.path.endsWith('.ts') ? '' : '.ts') })); } }] });
    return (await import(pathToFileURL(join(dir, 'b.mjs')).href)).symptomsInText;
  } finally { rmSync(dir, { recursive: true, force: true }); }
})();
const lis = (t, opts) => signesDe(t, opts, lire);
const def = (kapitel, pertinence, bank) => ({ kapitel, pertinence, bank });
const lex = () => ({
  symptomsInText: lire,
  PROFIL_EXIGE: { schmerz: ['ort', 'intensitaet'], diarrhoe: ['stuhlfrequenz'], dysphagie: ['schluck'] },
  PROFIL_EXCLUT: { generalisiert: ['ausstrahlung'] },
  SIGNE_DEF: {
    fieber: def('aktuell', 'screening'), ort: def('aktuell', 'screening', 'akt-ort'), intensitaet: def('aktuell', 'screening', 'akt-intensitaet'),
    stuhlfrequenz: def('aktuell', 'screening', 'akt-ausscheid-haeufigkeit'), ausstrahlung: def('aktuell', ['schmerz']),
    schluck: def('aktuell', ['dysphagie', 'hals'], 'akt-ausscheid-schlucken'), gelenke: def('fach', ['gelenk', 'arthritis']),
  },
});
const row = (ch, text, extra = {}) => ({ ch, text, probes: extra.probes ?? [], cs: !!extra.cs, sucht: extra.sucht ?? [], fu: extra.fu ?? [] });
const cas = (rows, over = {}) => ({ id: 'case-x', specialty: 'Allgemeinmedizin', kategorie: 'infekt', leit: ['Fieber'], antworten: {}, rows, ...over });

test('un signe cherché par deux unités → un doublon, avec sa raison ; une seule unité → aucun', () => {
  const r = mesurerCas(cas([row('aktuell', 'Haben Sie Fieber gemessen?', { probes: ['akt-infekt-fieber'] }), row('vegetativ', 'Hatten Sie Fieber?', { probes: ['veg-fieber'] })]), lex());
  assert.equal(r.dup.length, 1);
  assert.match(r.dup[0].why, /fieber.*2 unités/);
  assert.equal(mesurerCas(cas([row('aktuell', 'Haben Sie Fieber gemessen?')]), lex()).dup.length, 0);
});

test('D1 : une énumération cherche chaque signe qu\'elle nomme ; une dimension sur le motif ne cherche pas le symptôme nommé', () => {
  assert.ok(lis('Haben Sie Fieber, Augenentzündungen oder Durchfall?', { mother: true, ch: 'fach' }).has('fieber'));
  const dim = lis('Seit wann haben Sie Fieber?', { mother: true, ch: 'aktuell' });
  assert.ok(dim.has('beginn') && !dim.has('fieber'));
  assert.ok(!lis('Auslöser — Ist Ihnen ein Auslöser aufgefallen — ein Essen, eine Reise?', { mother: true, ch: 'aktuell' }).has('reise'), '(f) les exemples d\'un Auslöser ne sont pas demandés');
});

test('hors profil : « Schlucken » sans dysphagie → constat ; avec dysphagie → rien ; mutation : signe de dépistage → rien', () => {
  const rows = [row('aktuell', 'Bleibt beim Schlucken nur Festes stecken?', { probes: ['akt-ausscheid-schlucken'] })];
  assert.equal(mesurerCas(cas(rows), lex()).imp.length, 1);
  assert.equal(mesurerCas(cas(rows, { leit: ['Schluckbeschwerden'] }), lex()).imp.length, 0, 'dysphagie proposée depuis le motif');
  const l = lex(); l.SIGNE_DEF.schluck.pertinence = 'screening';
  assert.equal(mesurerCas(cas(rows), l).imp.length, 0, 'la mesure lit la pertinence du lexique');
});

test('exclusion : l\'irradiation d\'une douleur généralisée est hors profil', () => {
  const rows = [row('aktuell', 'Strahlen die Beschwerden irgendwohin aus?', { probes: ['akt-ausstrahlung'] })];
  const r = mesurerCas(cas(rows, { kategorie: 'schmerz', schmerz: { ort: 'am ganzen Körper', ausstrahlung: 'generalisiert' } }), lex());
  assert.equal(r.imp.length, 1);
  assert.match(r.imp[0].why, /exclu par le tag « generalisiert »/);
});

test('exigé et absent : la nature « schmerz » exige Ort et Intensität ; la banque est une projection r3, sans réponse = ajouteSansReponse', () => {
  const sans = mesurerCas(cas([row('aktuell', 'Seit wann?')], { kategorie: 'schmerz' }), lex());
  assert.deepEqual(sans.miss.map((x) => x.s).sort(), ['intensitaet', 'ort']);
  assert.equal(sans.ajoutSansReponse.length, 2);
  const repond = mesurerCas(cas([row('aktuell', 'Seit wann?')], { kategorie: 'schmerz', antworten: { 'akt-ort': 'x', 'akt-intensitaet': 'y' } }), lex());
  assert.equal(repond.miss.length, 2);
  assert.equal(repond.ajoutSansReponse.length, 0);
  const pose = mesurerCas(cas([row('aktuell', 'Wo genau spüren Sie die Beschwerden?'), row('aktuell', 'Wie stark sind die Beschwerden auf einer Skala von 1 bis 10?')], { kategorie: 'schmerz' }), lex());
  assert.equal(pose.miss.length, 0, 'cherché par une unité → présent');
});

test('D2 : le tag schmerz se propose depuis le PREMIER symptôme du motif, pas depuis une douleur accessoire', () => {
  const base = { specialty: 'x', verdacht: '' };
  assert.ok(profilPropose({ ...base, leit: ['Krampfartige Bauchschmerzen und Durchfälle'] }).tags.includes('schmerz'));
  assert.ok(!profilPropose({ ...base, leit: ['Fieber und Husten'], begleit: ['Kopfschmerzen'] }).tags.includes('schmerz'));
});

test('relances : l\'antécédent nommé sous une question sans rapport est détaché (sans condition) ou anomalie r4a (conditionnelle)', () => {
  const mere = (fu) => row('fach', 'Hatten Sie solche Gelenkbeschwerden schon einmal?', { probes: ['fach-rheuma-vorgeschichte'], fu });
  const libre = mesurerCas(cas([mere(['Hatten Sie schon einmal einen Gichtanfall oder Nierensteine?'])]), lex());
  assert.equal(libre.fu.length, 1);
  assert.equal(libre.fu[0].cond, false);
  const cond = mesurerCas(cas([mere(['Falls ja: Hatten Sie schon einmal einen Gichtanfall?'])]), lex());
  assert.equal(cond.fu[0].cond, true);
  assert.equal(mesurerCas(cas([mere(['Seit wann?'])]), lex()).fu.length, 0, 'une précision n\'est pas une relance hors signe');
});

test('ordre : « dort » avant toute question de voyage ; le voyage posé avant → rien ; les constats Q0 sont repris', () => {
  const dort = row('aktuell', 'Was haben Sie dort gegessen?', { cs: true });
  assert.equal(mesurerCas(cas([dort]), lex()).ord.length, 1);
  assert.equal(mesurerCas(cas([row('fach', 'Waren Sie kürzlich im Ausland?'), dort]), lex()).ord.length, 0);
  assert.equal(mesurerCas(cas([dort]), lex(), ['NP « Ihre Augenbrauen » [aktuell]']).ord.length, 2);
});

test('m1 : « vergesslich / Gedächtnis » (gedaechtnis) n\'est pas « Konzentration » : pas de faux doublon', () => {
  const lit = (t) => lis(t, { mother: true, ch: 'fach' });
  assert.ok(lit('Haben Sie Konzentrationsprobleme?').has('konzentration') && !lit('Haben Sie Konzentrationsprobleme?').has('gedaechtnis'));
  assert.ok(lit('Sind Sie vergesslich geworden?').has('gedaechtnis') && !lit('Sind Sie vergesslich geworden?').has('konzentration'));
  const r = mesurerCas(cas([row('aktuell', 'Sind Sie vergesslich geworden?', { cs: true }), row('fach', 'Fällt Ihnen die Konzentration schwer?', { probes: ['fach-psych-konzentration'] })]), lex());
  assert.equal(r.dup.length, 0);
});

test('m6 : UNE lecture — les 34 signes d\'origine lus par symptomsInText ; « Ruhe oder Schlaf » (Einfluss) n\'est pas la question du sommeil', () => {
  const lit2 = (t) => lis(t, { mother: false, ch: 'aktuell' });
  assert.ok(lit2('Haben Sie Schüttelfrost oder Schweißausbrüche?').has('schuettelfrost'));
  assert.ok(!lit2('Bessert es sich nach Ruhe oder Schlaf?').has('schlaf'));
  assert.ok(lit2('Wie ist Ihr Schlaf?').has('schlaf'));
  assert.ok(lit2('Wie lange sind Sie morgens steif?').has('steifigkeit'), 'les signes ajoutés gardent leur motif propre');
});

test('m6 : les parties d\'une question réduite (une même sonde) ne sont pas des unités concurrentes', () => {
  const r = mesurerCas(cas([row('vegetativ', 'Hatten Sie Schüttelfrost?', { probes: ['veg-schuettelfrost'], sucht: ['schuettelfrost'] }), row('vegetativ', 'Schwitzen Sie nachts?', { probes: ['veg-schuettelfrost'], sucht: ['nachtschweiss', 'schwitzen'] })]), lex());
  assert.equal(r.dup.length, 0);
});

test('ordre : « im Urlaub » nomme son contexte, ce n\'est pas une anaphore', () => {
  assert.equal(mesurerCas(cas([row('fach', 'Wird es im Urlaub besser?')]), lex()).ord.length, 0);
});

test('questions du cas muettes : celles sans `sucht` déclaré', () => {
  const r = mesurerCas(cas([row('aktuell', 'A?', { cs: true }), row('aktuell', 'B?', { cs: true, sucht: ['fieber'] })]), lex());
  assert.equal(r.muettes, 1);
  assert.equal(r.casTotal, 2);
});

// ── La porte : copie de travail du dépôt ─────────────────────────────────────
const sb = sandbox();
after(() => sb.dispose());
const run = (...a) => sb.run('checkCoherence.mjs', ...a);
const json = (r) => JSON.parse(r.stdout);
const FIXTURE = 'scripts/fixtures/coherence-budget.json';
const setFloor = (edit) => { const f = JSON.parse(sb.read(FIXTURE)); edit(f); writeFileSync(sb.path(FIXTURE), JSON.stringify(f, null, 2)); };
const restoreFloor = readFileSync(new URL('./fixtures/coherence-budget.json', import.meta.url), 'utf8');

test('la porte : lexique cohérent, aucun compteur au-dessus du plancher → exit 0', () => {
  const r = run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /COHÉRENCE \(mesure\)/);
  assert.match(r.stdout, /non mesurable avant K3/, 'nonReduit et casRetiresParR1 ne sont pas inventés');
});

// §10.6 : le fixture se met à jour dans le MÊME commit que le contenu. Une mesure plus BASSE que le
// plancher n'est donc pas un « bon » résultat silencieux : c'est un fixture à regraver (`--bless`).
const mesure = (o) => ({ ...o.brut, ...o.residu });
const attendu = () => { const f = JSON.parse(restoreFloor); return { ...f.brut, ...f.residu }; };

test('la mesure (--json, brut et residu) ÉGALE le plancher gravé', () => {
  const o = json(run('--json'));
  assert.equal(o.cas, 130);
  assert.deepEqual(mesure(o), attendu());
  assert.deepEqual(Object.keys(o.brut), ['doublons', 'doublonsCas', 'horsProfil', 'exigeAbsent', 'relancesOrphelines', 'brauchtViole', 'ajouteSansReponse']);
  assert.equal(o.residu.nonReduit, null);
  assert.equal(o.residu.casRetiresParR1, null);
});

test('m6 mutation : la lecture de « stuhl » (UNE seule, symptomsInText) désactivée fait baisser la mesure, et l\'égalité au plancher rougit', () => {
  const m = sb.mutate('src/data/guides/symptoms.ts', "['stuhl', /\\b(stuhlgang|durchfall|verstopfung)\\b/i]", "['stuhl', /(?!)/]", () => json(run('--json')));
  assert.ok(m.brut.doublons < attendu().doublons, `${m.brut.doublons} < ${attendu().doublons}`);
  assert.notDeepEqual(mesure(m), attendu());
});

test('mutation INV-77 : ausstrahlung exigé par « generalisiert » → exit 1, le lexique est dit incohérent', () => {
  const r = sb.mutate('src/data/guides/signes.ts', 'hoden: [], hals: [], gelenk: [], steifigkeit: [], generalisiert: [],', "hoden: [], hals: [], gelenk: [], steifigkeit: [], generalisiert: ['ausstrahlung'],", () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /LEXIQUE INCOHÉRENT/);
  assert.match(r.stdout, /INV-77/);
});

test('mutation INV-78 : stuhlfrequenz fusionné dans stuhl → exit 1', () => {
  const r = sb.mutate('src/data/guides/signes.ts', "'akt-ausscheid-haeufigkeit': ['stuhlfrequenz'],", "'akt-ausscheid-haeufigkeit': ['stuhl'],", () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /INV-78.*akt-ausscheid-was.*akt-ausscheid-haeufigkeit/);
});

test('mutation de motif : un motif de lecture qui nomme un signe hors lexique → exit 1', () => {
  const r = sb.mutate('scripts/coherenceMesure.mjs', '  zecke: /zecke/i,', '  zecke_inconnue: /zecke/i,', () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /« zecke_inconnue », qui n'est pas un signe du lexique/);
});

test('la mesure LIT le lexique : « Schlucken » devenu signe de dépistage → moins de questions hors profil', () => {
  const base = json(run('--json')).brut.horsProfil;
  const mut = sb.mutate('src/data/guides/signes.ts', "pertinence: ['dysphagie', 'hals'], bank: 'akt-ausscheid-schlucken'", "pertinence: S, bank: 'akt-ausscheid-schlucken'", () => json(run('--json')).brut.horsProfil);
  assert.ok(mut < base, `${mut} < ${base}`);
});

test('plancher dépassé → exit 1 et le dit ; --bless refuse la hausse et laisse le fixture intact', () => {
  setFloor((f) => { f.brut.doublons = 1; });
  const r = run();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /MESURE AU-DESSUS DU PLANCHER.*doublons 1 →/);
  const avant = sb.read(FIXTURE);
  const b = run('--bless');
  assert.equal(b.status, 1);
  assert.match(b.stdout, /--bless refusé/);
  assert.equal(sb.read(FIXTURE), avant);
  writeFileSync(sb.path(FIXTURE), restoreFloor);
  assert.equal(run().status, 0);
});

test('--case : la trame jouée, chaque constat et sa RAISON ; un cas inconnu → exit 2', () => {
  const r = run('--case', 'gastroenteritis');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /case-gastroenteritis — nature « ausscheidung »/);
  assert.match(r.stdout, /RAISON : le tag « diarrhoe » exige « stuhlfrequenz »/);
  assert.match(r.stdout, /RAISON : « schluck » n'est pertinent que pour/);
  assert.match(r.stdout, /RAISON : « dort » avant toute question sur « reise »/);
  assert.equal(run('--case', 'case-qui-nexiste-pas').status, 2);
});
