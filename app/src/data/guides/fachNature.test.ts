import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { buildRollenskript } from '@/lib/rolePlay';
import { fachChapterForCase } from './anamneseChapters';
import { phraseAlts, phraseFollowUp, phraseProbes, phraseText, type Phrase } from './phrases';
import pairs from '../../../scripts/fixtures/fach-nature-pairs.json';

// Série 3, lot L0 — la Fachanamnese jouée suit la NATURE du motif, pas
// seulement la spécialité. Chaque paire absurde mesurée le 3 oct. est une
// assertion : elle échoue tant que le cas la reçoit.
const cases = seedCases();
const byId = new Map(cases.map((c) => [c.id, c]));
const fachQ = (id: string, probe: string): Phrase | undefined =>
  (fachChapterForCase(byId.get(`case-${id}`)!)?.chapter.questions ?? []).find((p) => phraseProbes(p).includes(probe));
const allTexts = (q: Phrase) => [phraseText(q), ...phraseAlts(q), ...phraseFollowUp(q)];

type Group = { probe: string; match?: string; in?: 'text' | 'all'; cases: string[]; kept?: Record<string, string> };

describe('Paires (cas × sonde) absurdes — retirées de la trame jouée', () => {
  for (const g of (pairs as { groups: Group[] }).groups) {
    for (const id of g.cases) {
      const kept = g.kept?.[id];
      it(`${id} ${kept ? 'garde' : 'ne reçoit pas'} ${g.probe}${g.match ? ` /${g.match}/` : ''}`, () => {
        expect(byId.has(`case-${id}`)).toBe(true);
        const q = fachQ(id, g.probe);
        const hit = !!q && (!g.match || (g.in === 'text' ? [phraseText(q)] : allTexts(q)).some((t) => new RegExp(g.match!).test(t)));
        expect(hit).toBe(!!kept);
      });
    }
  }
});

describe('Le motif déclaré (motiv) des cas Ortho et des aortes', () => {
  const declared = ['osg-fraktur', 'bandscheibenvorfall', 'osteoporose', 'karpaltunnel', 'gonarthrose', 'schenkelhalsfraktur',
    'spinalkanalstenose', 'hws-diskusprolaps', 'coxarthrose', 'hueftkopfnekrose', 'lumboischialgie', 'bauchaortenaneurysma', 'aortendissektion'];
  it('les 13 cas le déclarent', () => {
    expect(declared.filter((id) => !byId.get(`case-${id}`)?.patientSheet.motiv)).toEqual([]);
  });
  it('tout cas qui joue la Fach Ortho le déclare (un import futur ne passe pas sans)', () => {
    const ortho = cases.filter((c) => (c.fachanamnese ?? c.specialty) === 'Orthopädie');
    expect(ortho.filter((c) => !c.patientSheet.motiv).map((c) => c.id)).toEqual([]);
  });
});

describe('Ortho : un seul membre, celui du cas', () => {
  const ortho = cases.filter((c) => (c.fachanamnese ?? c.specialty) === 'Orthopädie');
  it('aucune question jouée ne demande « Hand oder Fuß », « Arm oder Bein »', () => {
    const bad = ortho.flatMap((c) => (fachChapterForCase(c)?.chapter.questions ?? []).flatMap(allTexts)
      .filter((t) => /\b(Hand|Arm)\b[^?]*\boder\b[^?]*\b(Fuß|Bein)\b|\b(Fuß|Bein)\b[^?]*\boder\b[^?]*\b(Hand|Arm)\b|\/\s*(den|die|der|das)?\s*(Arm|Bein)\b/.test(t))
      .map((t) => `${c.id}: ${t}`));
    expect(bad).toEqual([]);
  });
  it('la cheville parle du pied, la main du canal carpien parle de la main', () => {
    expect(phraseText(fachQ('osg-fraktur', 'fach-ortho-durchblutung')!)).toMatch(/Fuß/);
    expect(phraseText(fachQ('osg-fraktur', 'fach-ortho-belastung')!)).toMatch(/gehen/);
    expect(phraseText(fachQ('karpaltunnel', 'fach-ortho-belastung')!)).toMatch(/Hand|Arm/);
    expect(phraseText(fachQ('hws-diskusprolaps', 'fach-ortho-belastung')!)).not.toMatch(/gehen/);
  });
  it('un mal de dos sans traumatisme ne reçoit ni la chute détaillée ni ses relances', () => {
    const q = fachQ('lumboischialgie', 'fach-ortho-mechanismus')!;
    expect(phraseAlts(q)).toEqual([]);
    expect(phraseFollowUp(q)).toEqual([]);
  });
  it('une chute garde ses relances (perte de connaissance, autres blessures)', () => {
    const fu = phraseFollowUp(fachQ('schenkelhalsfraktur', 'fach-ortho-mechanismus')!).join(' ');
    expect(fu).toMatch(/ohnmächtig/);
    expect(fu).toMatch(/woanders verletzt/);
  });
});

describe('L’écran du simulant (Rollenskript) lit la question canonique : elle ne nomme aucun membre', () => {
  // buildRollenskript affiche `PROBE_BY_ID[id].frage`, non adaptée au cas :
  // une `frage` qui dit « Fuß » s'affiche au-dessus de « die Hand ist nicht kalt ».
  for (const id of ['karpaltunnel', 'hws-diskusprolaps']) {
    it(`${id} : aucune question de la Fach ne parle du pied ni de la marche`, () => {
      const c = byId.get(`case-${id}`)!;
      const fach = buildRollenskript(c.patientSheet).find((ch) => ch.id === 'fach')!;
      expect(fach.lines.map((l) => l.frage ?? '').filter((f) => /Fuß|Füße|gehen/.test(f))).toEqual([]);
    });
  }
});

describe('Revue clinique L0', () => {
  it('la dissection garde la malperfusion du pied (« der linke Fuß fühlt sich kälter an »)', () => {
    const q = fachQ('aortendissektion', 'fach-gefaess-wunde');
    expect(q && phraseText(q)).toMatch(/Fuß kalt/);
  });
  it('une seule question par réplique, même avec un seul « ? » (mécanisme, vaccination)', () => {
    const mech = fachQ('osg-fraktur', 'fach-ortho-mechanismus')!;
    expect(phraseText(mech)).toBe('Wie ist es passiert?');
    expect(phraseAlts(mech).filter((t) => / — |, und /.test(t))).toEqual([]);
    expect(phraseText(fachQ('lyme', 'fach-infekt-impfung')!)).toBe('Sind Ihre Impfungen auf dem neuesten Stand?');
  });
  it('FSME : en relance de la tique, sur les seules trames qui la posent (décision de main)', () => {
    const fsme = (id: string) => (fachChapterForCase(byId.get(`case-${id}`)!)?.chapter.questions ?? []).flatMap(allTexts).filter((t) => /FSME/.test(t));
    expect(phraseFollowUp(fachQ('lyme', 'fach-infekt-zecke')!)).toContain('Falls ja: Sind Sie gegen FSME geimpft?');
    expect(fsme('meningitis')).toHaveLength(1);
    for (const id of ['tonsillitis', 'hepatitis-b', 'covid19']) expect(fsme(id)).toEqual([]);
  });
  it('rachis lombaire : l’irradiation ne suggère pas la réponse (ni genou ni pied)', () => {
    for (const id of ['lumboischialgie', 'bandscheibenvorfall', 'spinalkanalstenose'])
      expect(phraseText(fachQ(id, 'fach-ortho-ausstrahlung')!)).not.toMatch(/Knie|Fuß/);
  });
});
