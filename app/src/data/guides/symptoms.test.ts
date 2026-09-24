import { describe, expect, it } from 'vitest';
import { adaptChaptersForCase, fachChapterForCase } from './anamneseChapters';
import { dedupeBySymptom } from './symptoms';
import { phraseFollowUp, phraseProbes, phraseText, splitDimension } from './phrases';
import type { Case } from '@/db/types';

const mk = (over: Partial<Case> & { kategorie?: Case['patientSheet']['leitsymptomKategorie'] } = {}): Case =>
  ({
    specialty: over.specialty ?? 'Pneumologie',
    patientSheet: { personalia: { name: 'X', age: 60, geschlecht: 'm' }, schmerz: {}, leitsymptomKategorie: over.kategorie ?? 'infekt' },
    caseSpecificQuestions: over.caseSpecificQuestions ?? [],
  } as unknown as Case);
const texts = (c: Case) => {
  const out: Array<[string, string]> = [];
  const fach = fachChapterForCase(c);
  for (const ch of adaptChaptersForCase(c)) {
    for (const q of ch.questions) out.push([ch.id, phraseText(q)]);
    if (fach && ch.id === 'aktuell') for (const q of fach.chapter.questions) out.push([fach.chapter.id, phraseText(q)]);
  }
  return out;
};
const count = (c: Case, re: RegExp) => texts(c).filter(([, t]) => re.test(t));

describe('Un symptôme, une question (FB2-J10)', () => {
  it('CAP : la fièvre est cherchée une seule fois, dans « Aktuelle Beschwerden »', () => {
    const hits = count(mk(), /gemessen|Fieber oder Schüttelfrost|Fieber festgestellt/);
    expect(hits).toHaveLength(1);
    expect(hits[0][0]).toBe('aktuell');
  });
  it('CAP : le Schüttelfrost (déjà dans la question fièvre) ne revient pas en vegetativ — il reste le Nachtschweiß', () => {
    const veg = texts(mk()).filter(([ch]) => ch === 'vegetativ').map(([, t]) => t);
    expect(veg.some((t) => /Schüttelfrost/.test(t))).toBe(false);
    expect(veg.some((t) => /Schwitzen Sie nachts/.test(t))).toBe(true);
  });
  it('CAP : le voyage (Fach pneumo) n’est pas redemandé en vegetativ', () => {
    expect(count(mk(), /Ausland/)).toHaveLength(0);
    expect(count(mk(), /Reise/)).toHaveLength(1);
  });
  it('BPCO (atemnot) : la Fach pose la fièvre, la vegetative ne la répète pas', () => {
    const hits = count(mk({ kategorie: 'atemnot' }), /Fieber/);
    expect(hits.map(([ch]) => ch)).toEqual(['fach-pneumo']);
  });
  it('douleur × chirurgie : « Haben Sie Fieber ? » (redundant) s’efface devant la vegetative, plus riche', () => {
    const hits = count(mk({ specialty: 'Chirurgie', kategorie: 'schmerz' }), /Fieber/);
    expect(hits.map(([ch]) => ch)).toEqual(['vegetativ']);
  });
  it('une question du cas avec `sucht` remplace la question générale de son chapitre', () => {
    const c = mk({ caseSpecificQuestions: [{ frage: 'Haben Sie sich gewogen? Wie viele Kilo?', kapitel: 'vegetativ', sucht: ['gewicht'] }] });
    const veg = texts(c).filter(([ch]) => ch === 'vegetativ').map(([, t]) => t);
    expect(veg.filter((t) => /Gewicht|gewogen/.test(t))).toEqual(['Haben Sie sich gewogen? Wie viele Kilo?']);
  });
  it('une question du cas sans `sucht` ne retire rien', () => {
    const c = mk({ caseSpecificQuestions: [{ frage: 'Wie viele Kilo?', kapitel: 'vegetativ', relu: true }] });
    expect(texts(c).filter(([, t]) => /Gewichtsveränderungen/.test(t))).toHaveLength(1);
  });
  it('dedupeBySymptom : une question réduite garde les relances de la partie restante', () => {
    const out = dedupeBySymptom([
      { id: 'a', questions: [{ text: 'Fieber?', probe: 'akt-infekt-fieber' }] },
      { id: 'b', questions: [{ text: 'Fieber? Ausland?', probe: 'veg-fieber', followUp: ['x', 'y'], parts: [
        { sucht: ['fieber'], text: 'Fieber?', followUp: ['x'] }, { sucht: ['reise'], text: 'Ausland?', followUp: ['y'] }] }] },
    ]);
    expect(out[1].questions.map(phraseText)).toEqual(['Ausland?']);
    expect(phraseFollowUp(out[1].questions[0])).toEqual(['y']);
    expect(phraseProbes(out[1].questions[0])).toEqual(['veg-fieber']);
  });
});

describe('Dimension en tête de question (FB2-J11)', () => {
  it('extrait « Beginn », « Frühere Episoden », « Kontakt und Reise »', () => {
    expect(splitDimension('Beginn — Seit wann?')).toEqual({ dim: 'Beginn', body: 'Seit wann?' });
    expect(splitDimension('Frühere Episoden — Hatten Sie das schon?').dim).toBe('Frühere Episoden');
    expect(splitDimension('Kontakt und Reise — Waren Sie im Ausland?').dim).toBe('Kontakt und Reise');
  });
  it('laisse passer une question qui contient simplement un tiret', () => {
    expect(splitDimension('Wie sieht der Auswurf aus — Farbe und Menge?').dim).toBeUndefined();
    expect(splitDimension('Haben Sie Fieber, Nachtschweiß — so stark?').dim).toBeUndefined();
    expect(splitDimension('Gab es einen Auslöser — ein Essen?').dim).toBeUndefined();
  });
});

describe('Familienstand (FB2-J12)', () => {
  it('« Haben Sie Kinder ? » puis la relance ja/nein « wie viele, gesund »', () => {
    const q = adaptChaptersForCase(mk()).find((ch) => ch.id === 'familie-sozial')!.questions.find((x) => phraseProbes(x).includes('fam-stand'))!;
    expect(phraseText(q)).toBe('Wie ist Ihr Familienstand? Haben Sie Kinder?');
    expect(phraseFollowUp(q)).toEqual(['Falls ja: Wie viele, und sind sie gesund?']);
  });
});
