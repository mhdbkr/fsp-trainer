import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { fachChapterRaw, playedTrame } from './anamneseChapters';
import { phraseFollowUp, phraseFollowUps, phraseProbes, phraseText, type Phrase } from './phrases';
import { phraseSucht, SIGNE_DEF } from './symptoms';
import { DEFS_CAS } from './signesDefsCas';
import { DEFS_BASE } from './signesDefs';
import { RISIKO_SIGNES } from './coherence';
import { trameBrute } from './anamneseChapters';

// K4 (ADR-0023, contrat frage-atomique §10.10) — les questions du cas déclarent ce qu'elles posent ; les sondes à
// énumération reçoivent leurs `parts`. Ces tests gardent les règles nouvelles du lot ; chacun a sa mutation au rapport K4.
const cases = seedCases();
const byId = (id: string) => cases.find((c) => c.id === id)!;
/** La trame jouée à plat : [chapitre, phrase], la Fach à sa place (après Aktuelle Beschwerden). */
const joue = (id: string): Array<[string, Phrase]> => {
  const { chapters, fach } = playedTrame(byId(id));
  return chapters.flatMap((ch) => [
    ...ch.questions.map((p) => [ch.id, p] as [string, Phrase]),
    ...(fach && ch.id === 'aktuell' ? fach.chapter.questions.map((p) => ['fach', p] as [string, Phrase]) : []),
  ]);
};
const cherchent = (id: string, s: string) => joue(id).filter(([, p]) => phraseSucht(p).includes(s as never)
  || phraseFollowUps(p).some((f) => (f.sucht ?? []).includes(s)));

describe('K4 — les questions du cas déclarent ce qu’elles posent', () => {
  it('aucune question du cas n’est muette (K4 fixeur : anorexia-nervosa n° 7 déclare `todeswunsch`, D-1)', () => {
    const muettes = cases.flatMap((c) => (c.caseSpecificQuestions ?? []).flatMap((q, i) => (typeof q === 'string' || !q.sucht?.length ? [`${c.id}#${i}`] : [])));
    expect(muettes).toEqual([]);
  });
  it('m-1 : les signes des questions du cas ne reprennent aucun signe des sondes (sinon le spread de DEFS l’écraserait)', () => {
    expect(Object.keys(DEFS_CAS).filter((s) => s in DEFS_BASE)).toEqual([]);
  });
  it('chaque signe propre aux questions du cas (signesDefsCas) est déclaré par une question du cas, de dépistage, sans banque', () => {
    const declares = new Set<string>(cases.flatMap((c) => (c.caseSpecificQuestions ?? []).flatMap((q) => (typeof q === 'string' ? [] : [...(q.sucht ?? []), ...(q.braucht ?? [])]))));
    const morts = Object.keys(DEFS_CAS).filter((s) => !declares.has(s));
    expect(morts).toEqual([]);
    for (const s of Object.keys(DEFS_CAS)) {
      expect(SIGNE_DEF[s as keyof typeof SIGNE_DEF].pertinence, s).toBe('screening');
      expect(SIGNE_DEF[s as keyof typeof SIGNE_DEF].bank, s).toBeUndefined();
    }
  });
  it('les doublons renvoyés par les revues K3 : chaque signe n’est demandé qu’une fois', () => {
    const table: Record<string, string[]> = {
      'case-lyme': ['ausschlag', 'erythem_ring'],
      'case-schenkelhalsfraktur': ['bewusstlos', 'unfallhergang', 'antikoagulation'],
      'case-zystitis': ['urin_aspekt', 'harnwegsinfekt'],
      'case-rheumatoide-arthritis': ['einfluss'],
      'case-pankreatitis': ['stuhlaussehen'],
      'case-zoeliakie': ['stuhlaussehen'],
      'case-uterus-myomatosus': ['haematome', 'blutungsneigung'],
      'case-lymphom': ['knoten'],
      'case-itp': ['haematome', 'blutungsneigung'],
    };
    const fautes = Object.entries(table).flatMap(([id, ss]) => ss.flatMap((s) => {
      const n = cherchent(id, s).length;
      return n === 1 ? [] : [`${id} : « ${s} » demandé ${n} fois`];
    }));
    // La vaccination : une fois dans chaque cas.
    for (const c of cases) { const n = cherchent(c.id, 'impfung').length; if (n !== 1) fautes.push(`${c.id} : « impfung » demandé ${n} fois`); }
    expect(fautes).toEqual([]);
  });
});

/** La sonde est-elle encore posée avec ce signe (question ou part gardée) ? */
const pose = (id: string, probe: string, signe?: string) => joue(id).some(([, p]) => phraseProbes(p).includes(probe)
  && (!signe || phraseSucht(p).includes(signe as never) || phraseFollowUps(p).some((f) => (f.sucht ?? []).includes(signe))));
const texte = (id: string, probe: string) => joue(id).filter(([, p]) => phraseProbes(p).includes(probe)).map(([, p]) => [phraseText(p), ...phraseFollowUp(p)].join(' ')).join(' | ');

describe('K4 fixeur (revue I-3) — les doublons renvoyés : la sonde perdante est ABSENTE de la trame jouée', () => {
  // [cas, sonde perdante, signe qu'elle perd] : la question du cas le pose, la sonde (ou sa part) n'est plus posée.
  const PERDANTES: Array<[string, string, string]> = [
    ['case-zystitis', 'akt-ausscheid-harn-aussehen', 'urin_aspekt'], ['case-zystitis', 'fach-uro-farbe', 'urin_aspekt'],
    ['case-zystitis', 'fach-uro-vorgeschichte', 'harnwegsinfekt'], ['case-zystitis', 'akt-frueher', 'frueher'],
    ['case-lyme', 'fach-infekt-haut', 'ausschlag'], ['case-lyme', 'fach-infekt-haut', 'erythem_ring'],
    ['case-rheumatoide-arthritis', 'akt-einfluss', 'einfluss'],
    ['case-uterus-myomatosus', 'fach-haem-blutung', 'haematome'], ['case-uterus-myomatosus', 'fach-haem-blutung', 'blutungsneigung'],
    ['case-schenkelhalsfraktur', 'fach-ortho-mechanismus', 'unfallhergang'], ['case-schenkelhalsfraktur', 'fach-ortho-mechanismus', 'bewusstlos'],
    ['case-schenkelhalsfraktur', 'med-blutverduenner', 'antikoagulation'],
    ['case-itp', 'fach-haem-blutung', 'blutungsneigung'], ['case-zoeliakie', 'fach-gastro-stuhl', 'stuhlaussehen'],
    ['case-perikarditis', 'akt-einfluss', 'einfluss'], ['case-myokarditis', 'akt-einfluss', 'einfluss'],
    ['case-somatoforme-schmerzstoerung', 'akt-einfluss', 'einfluss'],
  ];
  it.each(PERDANTES)('%s : %s ne pose plus « %s »', (id, probe, signe) => {
    expect(pose(id, probe, signe)).toBe(false);
    expect(cherchent(id, signe)).toHaveLength(1);
  });
  it('zystitis : ni ictère ni couleur des selles (aktuellSkip de la Veränderung) ; les selles restent demandées en végétatif', () => {
    expect(pose('case-zystitis', 'akt-ausscheid-was')).toBe(false);
    expect(pose('case-zystitis', 'akt-ausscheid-aussehen')).toBe(false);
    expect(texte('case-zystitis', 'veg-ausscheidung')).toMatch(/Stuhlgang/);
  });
});

describe('K4 fixeur — la revue clinique : la question perdue revient dans la trame jouée', () => {
  const REVIENT: Array<[string, string, RegExp]> = [
    ['case-nephrotisches-syndrom', 'fach-nephro-aussehen', /schaumig/],            // P0
    ['case-nierenkolik', 'fach-uro-flanke', /Leiste/],                            // P1 : l'irradiation vers l'aine
    ['case-asthma', 'akt-verlauf', /anfallsartig/], ['case-pertussis', 'akt-verlauf', /anfallsartig/],
    ['case-tvt', 'fach-gefaess-immobilisation', /unbeweglich/],
    ['case-mammakarzinom', 'fach-gyn-brust', /Absonderungen/],
    ['case-uterus-myomatosus', 'fach-gyn-blutung', /Zwischenblutungen/],
    ['case-malaria', 'fach-infekt-impfung', /Impfungen/], ['case-malaria', 'fach-infekt-zecke', /Insektenstich/],
    ['case-lagerungsschwindel', 'akt-neuro-lage', /Kopf drehen/],
    ['case-myokardinfarkt', 'veg-uebelkeit', /übergeben/],                        // P2 : übel | erbrochen
    ['case-commotio', 'fach-neuro-koordination', /Schwindel/], ['case-commotio', 'veg-schuettelfrost', /Schweiß/],
    ['case-ileus', 'fach-chir-ileus', /heute Stuhlgang/],
    ['case-perikarditis', 'fach-kardio-atem', /Atmen/], ['case-myokarditis', 'fach-kardio-atem', /Atmen/],
  ];
  it.each(REVIENT)('%s : %s est posée', (id, probe, re) => {
    expect(texte(id, probe)).toMatch(re);
  });
  it('ordre (`braucht`) : chaque question du cas suit ce qu’elle présuppose', () => {
    const avant = (id: string, i: number, signe: string) => {
      const t = joue(id);
      const k = t.findIndex(([, p]) => typeof p !== 'string' && (p as { caseSpecific?: boolean }).caseSpecific && phraseText(p) === (byId(id).caseSpecificQuestions[i] as { frage: string }).frage);
      const j = t.findIndex(([, p]) => phraseSucht(p).includes(signe as never) || phraseFollowUps(p).some((f) => (f.sucht ?? []).includes(signe)));
      return j >= 0 && k > j;
    };
    expect(avant('case-tvt', 0, 'beginn')).toBe(true);
    expect(avant('case-lagerungsschwindel', 1, 'lageabhaengig')).toBe(true);
    expect(avant('case-hypothyreose', 7, 'kinder')).toBe(true);
    expect(avant('case-akutes-nierenversagen', 1, 'erbrechen')).toBe(true);
  });
  it('D-1 anorexia-nervosa : interrogatoire gradué — le désir de mort (Aktuelle Beschwerden), puis idées, plan, NOTFALL (Fach psy)', () => {
    expect(RISIKO_SIGNES.has('todeswunsch')).toBe(true);
    expect(cherchent('case-anorexia-nervosa', 'todeswunsch').map(([ch]) => ch)).toEqual(['aktuell']);
    const psy = texte('case-anorexia-nervosa', 'fach-psych-suizid');
    expect(psy).toMatch(/konkrete Pläne/);
    expect(psy).toMatch(/NOTFALL/);
    // Garantie de risque : tout signe de risque cherché par la trame brute l'est encore par la trame jouée.
    const brute = new Set(trameBrute(byId('case-anorexia-nervosa')).flatMap((ch) => ch.questions)
      .flatMap((p) => [...phraseSucht(p), ...phraseFollowUps(p).flatMap((f) => f.sucht ?? [])]));
    for (const s of RISIKO_SIGNES) if (brute.has(s)) expect(cherchent('case-anorexia-nervosa', s).length, s).toBeGreaterThan(0);
  });
});

describe('K4 — les parts découpées du texte', () => {
  it('toute variante à parts de la Fach jouée par un cas (FACH_RULES compris) : ses parts couvrent exactement sa déclaration', () => {
    const fautes: string[] = [];
    for (const c of cases) for (const q of fachChapterRaw(c)?.chapter.questions ?? []) {
      if (typeof q === 'string' || !q.parts) continue;
      const union = [...new Set(q.parts.flatMap((pt) => pt.sucht))].sort();
      const decl = [...phraseSucht(q)].sort();
      if (JSON.stringify(union) !== JSON.stringify(decl)) fautes.push(`${c.id} ${phraseProbes(q)[0]} : parts [${union}] ≠ [${decl}]`);
    }
    expect(fautes).toEqual([]);
  });
  it('une règle FACH_RULES qui réécrit le texte sans donner de parts n’en garde aucune (lumboischialgie : « Unfall oder Sturz »)', () => {
    const q = fachChapterRaw(byId('case-lumboischialgie'))!.chapter.questions.find((p) => phraseProbes(p).includes('fach-ortho-mechanismus'))!;
    expect(phraseText(q)).toBe('Hatten Sie in letzter Zeit einen Unfall oder einen Sturz?');
    expect(typeof q !== 'string' && q.parts).toBeFalsy();
  });
  it('goutte, option (b) : les relances de la goutte se posent dans la goutte, pas ailleurs (r1 retire la part `gicht_ausloeser`)', () => {
    const ausloeser = (id: string) => joue(id).find(([, p]) => phraseProbes(p).includes('fach-rheuma-ausloeser'))?.[1];
    const tout = (p?: Phrase) => (p ? [phraseText(p), ...phraseFollowUp(p)].join(' ') : '');
    expect(tout(ausloeser('case-gicht'))).toMatch(/Bier/);
    const ailleurs = cases.filter((c) => c.id !== 'case-gicht' && !c.patientSheet.profil?.tags.includes('gicht'))
      .map((c) => [c.id, ausloeser(c.id)] as const).filter(([, p]) => p);
    expect(ailleurs.length).toBeGreaterThan(0);
    for (const [id, p] of ailleurs) expect(tout(p), id).not.toMatch(/Bier|Wassertablette/);
  });
});
