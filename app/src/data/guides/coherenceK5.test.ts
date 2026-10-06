import { describe, expect, it } from 'vitest';
import type { Case, CaseQuestion } from '@/db/types';
import { seedCases } from '@/data/seedCases';
import { playedTrame } from './anamneseChapters';
import { phraseFollowUp, phraseProbes, phraseText, type Phrase } from './phrases';
import { phraseSucht } from './symptoms';

// K5 (ADR-0023, contrat frage-atomique §10.10) — `sucht` requis au type, contenu ancien toléré au montage (§10.8),
// et les deux reliquats « Pour K5 » des revues K4. Chaque garde a sa mutation au rapport K5.
const cases = seedCases();
const byId = (id: string) => cases.find((c) => c.id === id)!;
const joue = (c: Case): Array<[string, Phrase]> => {
  const { chapters, fach } = playedTrame(c);
  return chapters.flatMap((ch) => [
    ...ch.questions.map((p) => [ch.id, p] as [string, Phrase]),
    ...(fach && ch.id === 'aktuell' ? fach.chapter.questions.map((p) => ['fach', p] as [string, Phrase]) : []),
  ]);
};
/** Le texte posé d'une sonde (question et relances), ou undefined si elle n'est pas posée. */
const pose = (id: string, probe: string): string | undefined => {
  const hit = joue(byId(id)).find(([, p]) => phraseProbes(p).includes(probe));
  return hit && [phraseText(hit[1]), ...phraseFollowUp(hit[1])].join(' ↳ ');
};

describe('K5 — `CaseQuestion.sucht` requis au type', () => {
  it('une question du cas sans `sucht`, ou une chaîne, ne compile plus (le contenu écrit déclare toujours)', () => {
    // @ts-expect-error K5 : `sucht` est requis
    const muette: CaseQuestion = { frage: 'Haben Sie Fieber?', kapitel: 'aktuell' };
    // @ts-expect-error K5 : la forme chaîne n'a pas de `sucht`
    const chaine: CaseQuestion = 'Haben Sie Fieber?';
    // @ts-expect-error K5 : `sucht` non vide
    const vide: CaseQuestion = { frage: 'Haben Sie Fieber?', kapitel: 'aktuell', sucht: [] };
    const ok: CaseQuestion = { frage: 'Haben Sie Fieber?', kapitel: 'aktuell', sucht: ['fieber'] };
    expect([muette, chaine, vide, ok]).toHaveLength(4);
  });

  it('§10.8 : un contenu publié ANCIEN (chaîne, question sans `sucht`) se monte sans erreur ; ses questions sont posées', () => {
    const base = byId('case-gastroenteritis');
    const anciennes = ['Haben Sie Haustiere?', { frage: 'Arbeiten Sie in der Küche?', kapitel: 'familie-sozial' }] as unknown as CaseQuestion[];
    const ancien = { ...base, caseSpecificQuestions: [...base.caseSpecificQuestions, ...anciennes] } as Case;
    const textes = joue(ancien).map(([, p]) => phraseText(p));
    expect(textes).toContain('Haben Sie Haustiere?');
    expect(textes).toContain('Arbeiten Sie in der Küche?');
    // invisible à r2 (aucun signe), comme avant K5 : le reste de la trame ne bouge pas
    expect(joue(ancien).length).toBe(joue(base).length + 2);
  });
});

describe('K5 — reliquats « Pour K5 » des revues K4', () => {
  it('anorexia-nervosa : le vomissement provoqué est demandé une fois (n° 2) ; « Ist Ihnen übel? » reste, « Mussten Sie sich übergeben? » sort', () => {
    const veg = pose('case-anorexia-nervosa', 'veg-uebelkeit');
    expect(veg).toMatch(/^Ist Ihnen übel\?/);
    expect(veg).not.toMatch(/übergeben/);
    const erbrechen = joue(byId('case-anorexia-nervosa')).filter(([, p]) => phraseSucht(p).includes('erbrechen'));
    expect(erbrechen.map(([, p]) => phraseText(p))).toEqual(['Ich frage das ganz ohne Vorwurf: Kommt es vor, dass Sie sich nach dem Essen übergeben?']);
  });

  it('Fach neuro, motif « vertige » déclaré (lagerungsschwindel) : la coordination ne redemande pas le vertige', () => {
    const k = pose('case-lagerungsschwindel', 'fach-neuro-koordination')!;
    expect(k).not.toMatch(/Schwindel/);
    expect(k).toMatch(/beim Gehen unsicher/);
    expect(k).toMatch(/Sind Sie schon gestürzt\?/);   // la chute reste une question pour un patient qui a le vertige
  });

  it('Fach neuro, motif « chute » déclaré (commotio) : la coordination ne redemande pas la chute', () => {
    const k = pose('case-commotio', 'fach-neuro-koordination')!;
    expect(k).toMatch(/Schwindel/);   // revue K4 (P2) : le vertige après le choc reste demandé
    expect(k).toMatch(/beim Gehen unsicher/);
    expect(joue(byId('case-commotio')).some(([, p]) => /Sind Sie schon gestürzt/.test([phraseText(p), ...phraseFollowUp(p)].join(' ')))).toBe(false);
  });

  it('schlaganfall : la chute n\'est pas le motif (la fiche la dit à la coordination) — gardée, et « beim Sturz » vient après elle', () => {
    const k = pose('case-schlaganfall', 'fach-neuro-koordination')!;
    expect(k).toMatch(/Sind Sie schon gestürzt\?/);
    const flat = joue(byId('case-schlaganfall')).map(([, p]) => phraseText(p));
    const koord = flat.findIndex((t) => /Sind Sie schon gestürzt/.test(t));
    const sturz = flat.indexOf('Haben Sie sich beim Sturz von der Kellertreppe den Kopf gestoßen?');
    expect(sturz).toBeGreaterThan(koord);
  });

  it('la règle est déclarée, pas déduite de la nature : les autres cas « neurologisch » gardent la question entière', () => {
    for (const id of ['case-tia', 'case-multiple-sklerose', 'case-migraene', 'case-epilepsie']) {
      expect(pose(id, 'fach-neuro-koordination'), id).toBe('Haben Sie Schwindel, Gangunsicherheit oder das Gefühl zu schwanken? Sind Sie schon gestürzt?');
    }
  });
});
