// Extrait, pour chaque cas, les DD non neutralisées AVEC leur critère
// distinctif — la matière première pour écrire le negativeFinding manquant.
import { writeFileSync } from 'node:fs';
import { loadAll } from './loadCases.mjs';

const STOP = new Set(['eine','einer','eines','einem','einen','der','die','das','den','dem','des','und','oder','bei','mit','ohne','nach','vor','seit','sich','wird','wurde','werden','sind','ist','hat','habe','kein','keine','keinen','keiner','nicht','auch','noch','sehr','mehr','aber','als','wie','für','vom','zur','zum','beim','durch','über','unter','etwa','ca','ggf','bzw','sowie','dass','daher','deshalb','jedoch','dabei','damit','dann','schon','nur','ganz','allem','allen','ihre','ihrer','seine','seiner','dieser','diese','dieses','anamnestisch','patient','patientin','angabe','angaben','jahre','jahren','jahr']);
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-zäöüß0-9\s-]/g, ' ');
const stem = (w) => w.replace(/(en|em|er|es|e|n|s)$/, '');
const toks = (s) => [...new Set(norm(s).split(/[\s-]+/).filter((w) => w.length >= 5 && !STOP.has(w)).map(stem))];
const stemHay = (s) => norm(s).split(/[\s-]+/).map(stem).join(' ');

const { cases } = await loadAll();
const work = [];
for (const c of cases) {
  const ps = c.patientSheet || {};
  const hay = stemHay([...(ps.negativeFindings || []), ...(ps.begleitsymptome || []), ...(ps.leitsymptome || []), ...(ps.vorerkrankungen || [])].join(' '));
  const gaps = (c.medicalView?.differenzialdiagnosen || [])
    .filter((d) => { const t = toks(d.dd); return t.length && !t.some((w) => hay.includes(w)); })
    .map((d) => ({ dd: d.dd, unterscheidung: d.unterscheidung }));
  if (gaps.length) {
    work.push({
      id: c.id, pathology: c.pathology, specialty: c.specialty,
      verdachtsdiagnose: c.medicalView?.verdachtsdiagnose?.slice(0, 200),
      personalia: c.patientSheet?.personalia,
      leitsymptome: ps.leitsymptome,
      begleitsymptome: ps.begleitsymptome,
      vegetativeAnamnese: ps.vegetativeAnamnese,
      vorerkrankungen: ps.vorerkrankungen,
      negativeFindingsActuels: ps.negativeFindings,
      ddANeutraliser: gaps,
    });
  }
}
writeFileSync('scripts/cohesion-gaps.json', JSON.stringify(work, null, 1));
const total = work.reduce((s, w) => s + w.ddANeutraliser.length, 0);
console.log(`${work.length} cas à reprendre, ${total} DD à neutraliser.`);
for (const w of work) console.log(`  ${w.id.padEnd(26)} ${w.ddANeutraliser.length} DD`);
