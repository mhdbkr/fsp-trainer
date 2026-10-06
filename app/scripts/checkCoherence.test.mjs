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
import { DIM, SIG, mesurerCas, profilPropose, proposer, signesDe, totaux } from './coherenceMesure.mjs';

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
const row = (ch, text, extra = {}) => ({ ch, text, probes: extra.probes ?? [], cs: !!extra.cs, sucht: extra.sucht ?? [], fu: extra.fu ?? [], fuSucht: extra.fuSucht ?? [] });
const cas = (rows, over = {}) => ({ id: 'case-x', specialty: 'Allgemeinmedizin', kategorie: 'infekt', leit: ['Fieber'], antworten: {}, rows, ...over });

test('un signe cherché par deux unités → un doublon, avec sa raison ; une seule unité → aucun', () => {
  const r = mesurerCas(cas([row('aktuell', 'Haben Sie Fieber gemessen?', { probes: ['akt-infekt-fieber'], sucht: ['fieber'] }), row('vegetativ', 'Hatten Sie Fieber?', { probes: ['veg-fieber'], sucht: ['fieber'] })]), lex());
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
  const rows = [row('aktuell', 'Bleibt beim Schlucken nur Festes stecken?', { probes: ['akt-ausscheid-schlucken'], sucht: ['schluck'] })];
  assert.equal(mesurerCas(cas(rows), lex()).imp.length, 1);
  assert.equal(mesurerCas(cas(rows, { leit: ['Schluckbeschwerden'] }), lex()).imp.length, 0, 'dysphagie proposée depuis le motif');
  const l = lex(); l.SIGNE_DEF.schluck.pertinence = 'screening';
  assert.equal(mesurerCas(cas(rows), l).imp.length, 0, 'la mesure lit la pertinence du lexique');
});

test('exclusion : l\'irradiation d\'une douleur généralisée est hors profil', () => {
  const rows = [row('aktuell', 'Strahlen die Beschwerden irgendwohin aus?', { probes: ['akt-ausstrahlung'], sucht: ['ausstrahlung'] })];
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
  // une question du CAS (sans déclaration) : sa lecture dit si une relance sort de son signe
  const mere = (fu) => row('fach', 'Hatten Sie solche Gelenkbeschwerden schon einmal?', { cs: true, fu });
  const libre = mesurerCas(cas([mere(['Hatten Sie schon einmal einen Gichtanfall oder Nierensteine?'])]), lex());
  assert.equal(libre.fu.length, 1);
  assert.equal(libre.fu[0].cond, false);
  const cond = mesurerCas(cas([mere(['Falls ja: Hatten Sie schon einmal einen Gichtanfall?'])]), lex());
  assert.equal(cond.fu[0].cond, true);
  assert.equal(mesurerCas(cas([mere(['Seit wann?'])]), lex()).fu.length, 0, 'une précision n\'est pas une relance hors signe');
});

test('K1 : pour une sonde, la déclaration REMPLACE la lecture du texte ; une question du cas se lit encore', () => {
  const lex1 = lex();
  // « Seit wann haben Sie Fieber ? » : la sonde déclare `beginn`, le texte nomme `fieber` — seule la déclaration compte
  const guide = mesurerCas(cas([row('aktuell', 'Beginn — Seit wann haben Sie Fieber?', { probes: ['akt-beginn'], sucht: ['beginn'] }), row('vegetativ', 'Hatten Sie Fieber?', { probes: ['veg-fieber'], sucht: ['fieber'] })]), lex1);
  assert.equal(guide.dup.length, 0, 'beginn ≠ fieber : pas de faux doublon');
  // la même question, posée par le CAS sans déclaration, se lit : `fieber` y est cherché → doublon avec la sonde
  const cas1 = mesurerCas(cas([row('aktuell', 'Haben Sie Fieber?', { cs: true }), row('vegetativ', 'Hatten Sie Fieber?', { probes: ['veg-fieber'], sucht: ['fieber'] })]), lex1);
  assert.equal(cas1.dup.length, 1);
});

test('K4 fixeur (I-2) : doublon masqué — une question du cas déclarée dont le texte nomme un signe qu\'une SONDE jouée cherche', () => {
  const lex1 = lex();
  const veg = row('vegetativ', 'Hatten Sie Fieber?', { probes: ['veg-fieber'], sucht: ['fieber'] });
  const masque = mesurerCas(cas([row('aktuell', 'Tut das Schlucken beim Fieber weh?', { cs: true, sucht: ['schluck'] }), veg]), lex1);
  assert.equal(masque.masques.length, 1);
  assert.match(`${masque.masques[0].s} ${masque.masques[0].autre}`, /fieber .*veg-fieber/);
  assert.equal(totaux([masque], { sondesMuettes: 0 }).info.doublonsMasques, 1);
  const declare = mesurerCas(cas([row('aktuell', 'Tut das Schlucken beim Fieber weh?', { cs: true, sucht: ['schluck', 'fieber'] }), veg]), lex1);
  assert.equal(declare.masques.length, 0, 'déclaré : plus masqué (r2 tranchera)');
  const sansSonde = mesurerCas(cas([row('aktuell', 'Tut das Schlucken beim Fieber weh?', { cs: true, sucht: ['schluck'] })]), lex1);
  assert.equal(sansSonde.masques.length, 0, 'aucune sonde jouée ne cherche la fièvre');
});

test('K4 : une question du cas DÉCLARÉE se mesure par sa déclaration, comme une sonde ; muette, elle se lit encore', () => {
  const lex1 = lex();
  const veg = row('vegetativ', 'Hatten Sie Fieber?', { probes: ['veg-fieber'], sucht: ['fieber'] });
  // « beim Fieber » nomme la fièvre sans la demander : la question du cas déclare ce qu'elle cherche (ici `schluck`)
  const decl = mesurerCas(cas([row('aktuell', 'Tut das Schlucken beim Fieber weh?', { cs: true, sucht: ['schluck'] }), veg]), lex1);
  assert.equal(decl.dup.length, 0, 'la mention n\'est pas une recherche : pas de faux doublon');
  assert.deepEqual([...decl.units[0].all], ['schluck']);
  const muette = mesurerCas(cas([row('aktuell', 'Tut das Schlucken beim Fieber weh?', { cs: true }), veg]), lex1);
  assert.equal(muette.dup.length, 1, 'muette : le texte est lu');
});

test('K1 : une relance sans `followUpSucht` hérite de sa mère ; avec, elle devient une unité à part (son signe compte)', () => {
  const mere = (fu, fuSucht) => row('fach', 'Hatten Sie solche Gelenkbeschwerden schon einmal?', { probes: ['fach-rheuma-vorgeschichte'], sucht: ['gelenke'], fu, fuSucht });
  const herite = mesurerCas(cas([mere(['Hatten Sie schon einmal einen Gichtanfall oder Nierensteine?'], [])]), lex());
  assert.equal(herite.fu.length, 0, 'déclarée comme précision : aucun constat (la déclaration remplace la lecture)');
  const unite = mesurerCas(cas([row('aktuell', 'Haben Sie Fieber?', { probes: ['akt-infekt-fieber'], sucht: ['fieber'] }), mere(['Hatten Sie schon einmal Fieber?'], [['fieber']])]), lex());
  assert.equal(unite.dup.length, 1, 'la relance déclarée `fieber` double la question de fièvre');
});

test('K1 --propose : les signes lus d\'une question du cas non déclarée ; une relance qui nomme un autre signe est signalée, conditionnelle = alerte DM2', () => {
  const u = (r) => mesurerCas(cas([r]), lex()).units[0];
  const p = proposer(u(row('aktuell', 'Haben Sie Fieber gemessen? Wie hoch?', { cs: true, fu: ['Falls ja: Wann ist das Fieber am höchsten?', 'Haben Sie Husten?'] })));
  assert.deepEqual(p.sucht, ['fieber']);
  assert.equal(p.relances[0].horsSigne, false, 'une précision hérite');
  assert.deepEqual(p.relances[1].sucht, ['husten']);
  assert.equal(p.relances[1].alerte, false, 'inconditionnelle : unité à part');
  const cond = proposer(u(row('aktuell', 'Haben Sie Fieber gemessen?', { cs: true, fu: ['Falls ja: Haben Sie Husten?'] })));
  assert.equal(cond.relances[0].alerte, true, 'conditionnelle hors signe : à corriger à la source');
  assert.deepEqual(proposer(u(row('aktuell', 'Wie ist Ihre Gemütslage?', { cs: true }))).sucht, [], 'aucun signe lu : le relecteur déclare');
});

test('K1 : aucun motif de la mesure ne place `\\b` contre une lettre accentuée (« übel », « Ängste » n\'étaient jamais lus)', () => {
  const garde = /\\b\(?(?:[^|)]*\|)*[äöüÄÖÜß]|[äöüÄÖÜß]\\b/;
  assert.deepEqual(Object.entries({ ...DIM, ...SIG }).filter(([, re]) => garde.test(re.source)).map(([k]) => k), []);
  assert.ok(garde.test(/\b(übel|übergeben)\b/.source), 'la garde rougit sur l\'ancien motif');
  assert.ok(lis('Ist Ihnen während der Schmerzen übel?', { mother: false, ch: 'fach' }).has('uebelkeit'));
  assert.ok(lis('Haben Sie Ängste?', { mother: true, ch: 'fach' }).has('angst'));
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
  assert.match(r.stdout, /PORTE APRÈS MONTAGE \(bloquante, 0 attendu\) : doublons 0 · horsProfil 0 · exigeAbsent 0 · relancesOrphelines 0 · brauchtViole 0 · ajouteSansReponse 0 · casRetiresParR1 0/);
  assert.match(r.stdout, /✅ COHÉRENCE — lexique cohérent, porte après montage à 0/);
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
  // K3 : le résidu du moteur est mesuré (plus `null`) ; la porte après montage est à 0.
  assert.ok(Number.isInteger(o.residu.nonReduit));
  assert.equal(o.residu.casRetiresParR1, 0);
  assert.deepEqual(o.apres, { doublons: 0, horsProfil: 0, exigeAbsent: 0, relancesOrphelines: 0, brauchtViole: 0, ajouteSansReponse: 0 });
  assert.deepEqual(o.porte, []);
});

test('m6 mutation : la lecture de « stuhl » (UNE seule, symptomsInText) désactivée fait baisser la mesure, et l\'égalité au plancher rougit', () => {
  // K4 : une question du cas DÉCLARÉE se mesure par sa déclaration ; seule une question muette se lit. La mutation rend donc
  // d'abord muette la question « Stuhlgang » de parkinson (n° 6), puis désactive la lecture de « stuhl ».
  const PARK = "{ frage: 'Haben Sie regelmäßig Stuhlgang, und seit wann besteht die Verstopfung?', kapitel: 'vegetativ', sucht: ['stuhl'] },";
  const muette = PARK.replace(", sucht: ['stuhl']", '');
  const lu = sb.mutate('src/data/seedCases.ts', PARK, muette, () => json(run('--json')));
  const m = sb.mutate('src/data/seedCases.ts', PARK, muette, () => sb.mutate('src/data/guides/symptoms.ts', "['stuhl', /\\b(stuhlgang|durchfall|verstopfung)\\b/i]", "['stuhl', /(?!)/]", () => json(run('--json'))));
  assert.ok(m.brut.doublons < lu.brut.doublons, `${m.brut.doublons} < ${lu.brut.doublons}`);
  assert.notDeepEqual(mesure(lu), attendu());
});

test('mutation INV-77 : ausstrahlung exigé par « generalisiert » → exit 1, le lexique est dit incohérent', () => {
  const r = sb.mutate('src/data/guides/signes.ts', 'hoden: [], hals: [], gelenk: [], steifigkeit: [], generalisiert: [],', "hoden: [], hals: [], gelenk: [], steifigkeit: [], generalisiert: ['ausstrahlung'],", () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /LEXIQUE INCOHÉRENT/);
  assert.match(r.stdout, /INV-77/);
});

test('mutation INV-78 : stuhlfrequenz fusionné dans stuhl → exit 1', () => {
  const r = sb.mutate('src/data/guides/probeSucht.ts', "'akt-ausscheid-haeufigkeit': ['stuhlfrequenz'],", "'akt-ausscheid-haeufigkeit': ['stuhl'],", () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /INV-78.*akt-ausscheid-was.*akt-ausscheid-haeufigkeit/);
});

test('mutation de motif : un motif de lecture qui nomme un signe hors lexique → exit 1', () => {
  const r = sb.mutate('scripts/coherenceMesure.mjs', '  zecke: /zecke/i,', '  zecke_inconnue: /zecke/i,', () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /« zecke_inconnue », qui n'est pas un signe du lexique/);
});

test('la mesure LIT le lexique : « Ausstrahlung » devenu signe de dépistage → moins de questions hors profil', () => {
  const base = json(run('--json')).brut.horsProfil;
  // K4 : r1 a retiré les sondes hors profil ; restent les deux questions du cas gardées (ausstrahlung : pankreaskarzinom, cml).
  const mut = sb.mutate('src/data/guides/signesDefs.ts', "ausstrahlung: { kapitel: 'aktuell', pertinence: ['schmerz', 'anfall', 'neurologisch', 'nerven', 'stein', 'hoden'], bank: 'akt-ausstrahlung' }", "ausstrahlung: { kapitel: 'aktuell', pertinence: S, bank: 'akt-ausstrahlung' }", () => json(run('--json')).brut.horsProfil);
  assert.ok(mut < base, `${mut} < ${base}`);
});

test('plancher dépassé → exit 1 et le dit ; --bless refuse la hausse et laisse le fixture intact', () => {
  setFloor((f) => { f.brut.doublons = 0; });   // K4 : la mesure vaut 1
  const r = run();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /MESURE AU-DESSUS DU PLANCHER.*doublons 0 →/);
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
  assert.match(r.stdout, /DÉPLACÉ cas:0 : après la question qui cherche « reise » \(braucht\)/);   // K3 : « dort » déclare braucht reise, r4b le place
  // K3 : les écarts du moteur, chacun avec sa raison (§10.5)
  assert.match(r.stdout, /── ÉCARTS du moteur \(cohere, K3\)/);
  assert.match(r.stdout, /RETIRÉ akt-ausscheid-schlucken : schluck — hors profil \(profil\)/);
  assert.match(r.stdout, /AJOUTÉ akt-ort : ort — exigé par « schmerz »/);
  assert.match(r.stdout, /porte après montage : doublons 0 · horsProfil 0/);
  assert.equal(run('--case', 'case-qui-nexiste-pas').status, 2);
});

test('--propose : la proposition lit les questions du cas non déclarées, n\'écrit rien, un cas inconnu → exit 2', () => {
  const avant = sb.read('src/data/seedCases.ts');
  // K4 : tout est déclaré sauf le résidu justifié ; la question n° 0 de schenkelhalsfraktur est rendue muette pour la proposition.
  const SHF = "kapitel: 'aktuell', sucht: ['unfallhergang', 'schwindel'], relu: true },";
  const r = sb.mutate('src/data/seedCases.ts', SHF, "kapitel: 'aktuell' },", () => run('--propose', '--case', 'schenkelhalsfraktur'));
  // K5 : une question muette fait échouer la porte (résidu bloquant à 0) — la proposition est écrite quand même.
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stdout, /PROPOSITION de `sucht`/);
  assert.match(r.stdout, /sucht proposé : schwindel, bewusstlos, sturz/);
  assert.match(r.stdout, /rien n'est appliqué/);
  assert.equal(sb.read('src/data/seedCases.ts'), avant, 'jamais appliqué automatiquement');
  assert.equal(run('--propose', '--case', 'case-qui-nexiste-pas').status, 2);
  const j = JSON.parse(run('--propose', '--json').stdout);
  assert.equal(j.length, json(run('--json')).residu.questionsMuettes, 'une proposition par question du cas muette');
  assert.ok(j.every((p) => Array.isArray(p.sucht) && Array.isArray(p.relances)));
});

test('INV-79 mutation : une sonde qui perd son entrée de PROBE_SUCHT → exit 1 (la porte lit la déclaration)', () => {
  const r = sb.mutate('src/data/guides/probeSucht.ts', "'fach-rheuma-systemisch': ['fieber', 'augenentzuendung', 'ulzera', 'stuhl'],", '', () => run());   // K3 (revue P2) : sans ausschlag
  assert.equal(r.status, 1);
  assert.match(r.stdout, /INV-79 : la sonde « fach-rheuma-systemisch » ne déclare aucun sucht/);
});

test('INV-84 mutation : une relance conditionnelle qui déclare un autre signe → exit 1', () => {
  // K4 : la relance « Gichtanfall oder Nierensteine » est découpée en deux ; la première porte `gicht`.
  const r = sb.mutate('src/data/guides/anamneseChapters.ts', "'Hatten Sie schon einmal einen Gichtanfall?'", "'Falls ja: Hatten Sie schon einmal einen Gichtanfall?'", () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /INV-84.*fach-rheuma-vorgeschichte.*conditionnelle 0/);
});

// ── K2 : le profil DÉCLARÉ (INV-80, INV-88 / I6, INV-90) ─────────────────────
test('INV-90 (mesure) : un profil déclaré remplace la proposition ; sans profil, la mesure reste celle de K0/K1 (proposition)', () => {
  const rows = [row('aktuell', 'Bleibt beim Schlucken nur Festes stecken?', { probes: ['akt-ausscheid-schlucken'], sucht: ['schluck'] })];
  const motif = { leit: ['Schluckbeschwerden'] };   // la proposition lirait « dysphagie »
  assert.equal(mesurerCas(cas(rows, motif), lex()).imp.length, 0, 'sans profil : proposition, inchangée');
  const decl = mesurerCas(cas(rows, { ...motif, profil: { tags: ['infekt'] } }), lex());
  assert.equal(decl.imp.length, 1, 'profil déclaré sans dysphagie : la proposition ne joue plus');
  assert.match(decl.imp[0].why, /profil déclaré/);
  const exclu = mesurerCas(cas([row('fach', 'Welche Gelenke?', { probes: ['fach-rheuma-gelenke'], sucht: ['gelenke'] })], { profil: { tags: ['gelenk'], exclut: { gelenke: 'raison' } } }), lex());
  assert.match(exclu.imp[0].why, /exclu par le profil du cas/);
});

test('INV-80 mutation : profil supprimé de case-gastroenteritis → exit 1, la porte le nomme', () => {
  const r = sb.mutate('src/data/seedCases.ts', "        profil: { tags: ['ausscheidung', 'schmerz', 'diarrhoe', 'reise', 'gewichtsverlust'] },\n", '', () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /INV-80 : case-gastroenteritis n'a pas de profil/);
});

test('INV-80 mutation : la banque de « ort » dans aktuellSkip d\'un cas tagué schmerz → exit 1', () => {
  const r = sb.mutate('src/data/seedCases.ts', "        aktuellSkip: ['akt-ausscheid-was'],", "        aktuellSkip: ['akt-ausscheid-was', 'akt-ort'],", () => run());   // K3 : gastroenteritis a son aktuellSkip
  assert.equal(r.status, 1);
  assert.match(r.stdout, /INV-80 : case-gastroenteritis — exige « ort », dont la banque « akt-ort » est skippée/);
});

test('I6 / INV-88 : ajouteSansReponse = 0 ; la réponse de la banque de stuhlfrequenz retirée de case-zoeliakie (r3 l\'ajoute) → porte rouge, exit 1', () => {
  assert.equal(JSON.parse(restoreFloor).brut.ajouteSansReponse, 0, 'K3 ne merge qu\'à 0 (I6)');
  const r = sb.mutate('src/data/seedCases.ts', "          'akt-ausscheid-haeufigkeit': 'Drei- bis viermal am Tag. Nachts muss ich deswegen nicht aufstehen.',", '', () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /PORTE APRÈS MONTAGE[\s\S]*ajouteSansReponse = 1 après montage : case-zoeliakie/);
});

// ── K3 : la porte APRÈS montage est bloquante (INV-89) — chaque règle désactivée la fait rougir ─────────
test('mutation r2 désactivée : des doublons restent après montage → exit 1', () => {
  const r = sb.mutate('src/data/guides/coherence.ts', 'for (const [u, m] of pertes) perdre(', 'for (const [u, m] of new Map<U, Map<Signe, U>>()) perdre(', () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /doublons = \d+ après montage/);
});
test('mutation r1 désactivée : des questions hors profil restent → exit 1', () => {
  const r = sb.mutate('src/data/guides/coherence.ts', '    perdre(u, H, 1, cause);', '    void H;', () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /horsProfil = \d+ après montage/);
});
test('mutation : r1 qui retire une question du cas → casRetiresParR1 > 0 → exit 1', () => {
  const r = sb.mutate('src/data/guides/coherence.ts', "    if (u.cas) { ecart({ regle: 1, action: 'anomalie', question: u.id, signes: H, cause }); continue; }", '', () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /casRetiresParR1 = \d+ : r1 ne retire jamais une question du cas/);
});
test('COHERENCE_ALLOWED : une entrée sans raison, non datée au fixture et périmée → exit 1', () => {
  const r = sb.mutate('src/data/guides/coherence.ts', 'export const COHERENCE_ALLOWED: ReadonlyArray<CoherenceException> = [];',
    "export const COHERENCE_ALLOWED: ReadonlyArray<CoherenceException> = [{ caseId: 'case-gastroenteritis', question: 'akt-motiv', signe: 'motiv', regle: 2, raison: '', relecteur: 'x' }];", () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /COHERENCE_ALLOWED case-gastroenteritis\|akt-motiv\|motiv : raison et relecteur obligatoires/);
  assert.match(r.stdout, /absente du fixture/);
  assert.match(r.stdout, /périmée/);
});

// ── K5 : la porte complète (INV-89), le résidu bloquant, le détecteur de texte informatif (m-2) ─────────────
test('K5 (m-2) : `brauchtViole` du plancher ne compte plus le détecteur de texte — il est informatif, hors plancher', () => {
  const dort = row('aktuell', 'Was haben Sie dort gegessen?', { cs: true });
  const r = mesurerCas(cas([dort]), lex(), ['NP « Ihre Augenbrauen » [aktuell]']);
  assert.equal(r.ord.length, 2, 'le détecteur voit toujours : anaphore + Q0');
  const T = totaux([r], { sondesMuettes: 0 });
  assert.equal(T.brut.brauchtViole, null, 'exact seulement sur le montage (r4b) : checkCoherence le remplit');
  assert.equal(T.info.presuppositionsTexte, 2);
});

test('K5 (m-2) : le plancher `brauchtViole` est l\'exact r4b du montage ; le détecteur de texte se lit en informatif', () => {
  const o = json(run('--json'));
  assert.equal(o.brut.brauchtViole, o.apres.brauchtViole);
  assert.equal(o.brut.brauchtViole, 0);
  assert.ok(o.info.presuppositionsTexte > 0, 'les constats du détecteur Q0 restent lisibles');
  assert.ok(Number.isInteger(o.info.doublonsMasques), 'doublonsMasques reste informatif');
});

test('K5 (m-2) mutation : une présupposition de TEXTE de plus (« dort ») ne bloque plus — le détecteur reste informatif', () => {
  const PARK = "{ frage: 'Haben Sie regelmäßig Stuhlgang, und seit wann besteht die Verstopfung?', kapitel: 'vegetativ', sucht: ['stuhl'] },";
  const base = json(run('--json')).info.presuppositionsTexte;
  const r = sb.mutate('src/data/seedCases.ts', PARK, PARK.replace('Haben Sie regelmäßig', 'Haben Sie dort regelmäßig'), () => ({ j: json(run('--json')), s: run().status }));
  assert.equal(r.j.info.presuppositionsTexte, base + 1);
  assert.equal(r.s, 0, 'une hausse de faux positifs du détecteur ne bloque pas');
});

test('K5 (INV-85) mutation : r4b désactivé → brauchtViole > 0 après montage → exit 1', () => {
  const r = sb.mutate('src/data/guides/coherence.ts', 'for (let pass = 0; pass < n; pass++) {', 'for (let pass = 0; pass < 0; pass++) {', () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /brauchtViole = \d+ après montage/);
});

test('K5 : le résidu est BLOQUANT à 0, indépendamment du fixture — une question du cas muette → exit 1', () => {
  setFloor((f) => { f.residu.questionsMuettes = 5; });   // même un plancher complaisant ne l'excuse pas
  try {
    const PARK = "{ frage: 'Haben Sie regelmäßig Stuhlgang, und seit wann besteht die Verstopfung?', kapitel: 'vegetativ', sucht: ['stuhl'] },";
    const r = sb.mutate('src/data/seedCases.ts', PARK, PARK.replace(", sucht: ['stuhl']", ''), () => run());
    assert.equal(r.status, 1);
    assert.match(r.stdout, /questionsMuettes = 1 : résidu bloquant à 0/);
  } finally { writeFileSync(sb.path(FIXTURE), restoreFloor); }
});

test('K5 : résidu bloquant — une sonde réduite sans `parts` (nonReduit) → exit 1, même avec un plancher complaisant', () => {
  setFloor((f) => { f.residu.nonReduit = 99; });
  try {
    const PARTS = "          { sucht: ['schwindel'], text: 'Haben Sie Schwindel oder das Gefühl zu schwanken?' },\n          { sucht: ['gang'], text: 'Fühlen Sie sich beim Gehen unsicher?' },\n          { sucht: ['sturz'], text: 'Sind Sie schon gestürzt?' },\n";
    const r = sb.mutate('src/data/guides/anamneseChapters.ts', PARTS, '', () => run());
    assert.equal(r.status, 1);
    assert.match(r.stdout, /nonReduit = \d+ : résidu bloquant à 0/);
  } finally { writeFileSync(sb.path(FIXTURE), restoreFloor); }
});

// INV-89 : chaque défaut d'une exception rougit SEUL ; une exception valide passe la porte.
const ALLOWED_VIDE = 'export const COHERENCE_ALLOWED: ReadonlyArray<CoherenceException> = [];';
const avecExceptions = (entries, dates, fn) => {
  setFloor((f) => { f.allowed = dates; });
  try {
    return sb.mutate('src/data/guides/coherence.ts', ALLOWED_VIDE, `export const COHERENCE_ALLOWED: ReadonlyArray<CoherenceException> = ${JSON.stringify(entries)};`, fn);
  } finally { writeFileSync(sb.path(FIXTURE), restoreFloor); }
};
const ACTIVE = { caseId: 'case-gastroenteritis', question: 'fach-infekt-fieber', signe: 'fieber', regle: 2, raison: 'test K5', relecteur: 'test' };
const DATEE = [{ id: 'case-gastroenteritis|fach-infekt-fieber|fieber', date: '2026-10-06', raison: 'test K5' }];

test('INV-89 témoin : une exception valide (raison, relecteur, datée, active) → la porte ne dit rien', () => {
  const o = avecExceptions([ACTIVE], DATEE, () => json(run('--json')));
  assert.deepEqual(o.porte, []);
  assert.deepEqual(o.structure, []);
});
test('INV-89 mutation : exception sans raison → exit 1, et seulement ce défaut', () => {
  const o = avecExceptions([{ ...ACTIVE, raison: ' ' }], DATEE, () => json(run('--json')));
  assert.deepEqual(o.porte, ['COHERENCE_ALLOWED case-gastroenteritis|fach-infekt-fieber|fieber : raison et relecteur obligatoires']);
});
test('INV-89 mutation : exception sans relecteur → exit 1', () => {
  const r = avecExceptions([{ ...ACTIVE, relecteur: '' }], DATEE, () => run());
  assert.equal(r.status, 1);
  assert.match(r.stdout, /raison et relecteur obligatoires/);
});
test('INV-89 mutation : exception non datée au fixture → exit 1, et seulement ce défaut', () => {
  const o = avecExceptions([ACTIVE], [], () => json(run('--json')));
  assert.deepEqual(o.porte, ['COHERENCE_ALLOWED case-gastroenteritis|fach-infekt-fieber|fieber : absente du fixture (allowed : id, date, raison)']);
});
test('INV-89 mutation : exception PÉRIMÉE (cohere ne ferait rien sans elle) → exit 1, et seulement ce défaut', () => {
  const perimee = { ...ACTIVE, question: 'akt-motiv', signe: 'motiv' };
  const o = avecExceptions([perimee], [{ id: 'case-gastroenteritis|akt-motiv|motiv', date: '2026-10-06', raison: 'test K5' }], () => json(run('--json')));
  assert.deepEqual(o.porte, ['COHERENCE_ALLOWED case-gastroenteritis|akt-motiv|motiv : périmée (cohere ne ferait rien sans elle)']);
});

// INV-89 : la porte est BLOQUANTE en CI — l'étape de cohérence ne porte pas `|| true` ; les tests de mutation tournent.
const fautesCI = (yml) => {
  const f = [];
  const ligne = yml.split('\n').find((l) => /run: node scripts\/checkCoherence\.mjs/.test(l));
  if (!ligne) f.push('aucune étape ne lance checkCoherence.mjs');
  else if (/\|\|\s*true/.test(ligne)) f.push(`checkCoherence.mjs lancé avec || true : ${ligne.trim()}`);
  for (const t of ['checkCoherence.test.mjs', 'checkGuideDuplicates.test.mjs', 'checkBudgetFloor.test.mjs']) {
    if (!new RegExp(`^\\s*node --test scripts/${t.replaceAll('.', '\\.')}(\\s|$)`, 'm').test(yml)) f.push(`${t} absent de node --test`);
  }
  return f;
};
test('INV-89 : quality.yml lance la porte sans `|| true` et ses tests de mutation ; mutation `|| true` → rouge', () => {
  const yml = readFileSync(new URL('../../.github/workflows/quality.yml', import.meta.url), 'utf8');
  assert.deepEqual(fautesCI(yml), []);
  assert.match(fautesCI(yml.replace('run: node scripts/checkCoherence.mjs', 'run: node scripts/checkCoherence.mjs || true')).join(), /\|\| true/);
  assert.match(fautesCI(yml.replace(/\n\s*node --test scripts\/checkGuideDuplicates\.test\.mjs/, '')).join(), /checkGuideDuplicates\.test\.mjs absent/);
});
