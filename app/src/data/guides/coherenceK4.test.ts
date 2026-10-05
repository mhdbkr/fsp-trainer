import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { fachChapterRaw, playedTrame } from './anamneseChapters';
import { phraseFollowUp, phraseFollowUps, phraseProbes, phraseText, type Phrase } from './phrases';
import { phraseSucht, SIGNE_DEF } from './symptoms';
import { DEFS_CAS } from './signesDefsCas';

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
  it('une seule question du cas reste muette, et c’est le résidu justifié (anorexia-nervosa n° 7, sécurité)', () => {
    const muettes = cases.flatMap((c) => (c.caseSpecificQuestions ?? []).flatMap((q, i) => (typeof q === 'string' || !q.sucht?.length ? [`${c.id}#${i}`] : [])));
    expect(muettes).toEqual(['case-anorexia-nervosa#7']);
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
