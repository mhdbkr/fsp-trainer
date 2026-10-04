import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { FACH_COVERS, playedTrame } from './anamneseChapters';
import { phraseFollowUp, phraseIsCaseSpecific, phraseProbes, type Phrase } from './phrases';

// K0 — non-régression du montage ACTUEL (ADR-0023). `FACH_COVERS` et
// `dedupeBySymptom` seront remplacés par `cohere` en K3 ; ce test fige ce qu'ils
// font aujourd'hui, cas par cas, pour que K3 compare avant / après. K0 ne doit
// rien changer : tant que le montage ne bouge pas, ce test reste vert.
//
// Ce qui est gelé, c'est la STRUCTURE de la trame jouée (quelle sonde, dans quel
// chapitre, dans quel ordre, réduite ou non), pas les mots : une retouche de
// rédaction ne fait pas rougir. Un lot qui change la trame jouée d'un cas
// (DM1 en K1, `sucht` du cas, une sonde ajoutée) régénère le gel — `vitest -u` —
// et le diff du commit dit quels cas ont bougé.
// Les relances comptent (`↳n`, via phraseFollowUp) : une relance déplacée ou détachée par K1 / K3
// change le nombre de relances de sa mère, donc le diff du gel ; les mots d'une relance, eux, ne sont pas gelés.
const key = (p: Phrase): string => {
  const relances = phraseFollowUp(p).length ? `↳${phraseFollowUp(p).length}` : '';
  if (phraseIsCaseSpecific(p)) return `cas${relances}`;
  const probes = phraseProbes(p).join('+');
  // une question réduite par `parts` (dedupeBySymptom) porte le `sucht` de ce qui reste
  const reduced = typeof p !== 'string' && p.sucht ? `~${p.sucht.join(',')}` : '';
  return `${probes || '·'}${reduced}${relances}`;
};

describe('Montage actuel gelé (FACH_COVERS + dedupeBySymptom, 130 cas)', () => {
  const cases = seedCases();

  it('la trame jouée de chaque cas : chapitres, ordre, Fach, questions réduites', async () => {
    const lines = cases.map((c) => {
      const { chapters, fach } = playedTrame(c);
      const parts: string[] = [];
      for (const ch of chapters) {
        parts.push(`${ch.id}[${ch.questions.map(key).join(' ')}]`);
        if (fach && ch.id === 'aktuell') parts.push(`${fach.chapter.id}[${fach.chapter.questions.map(key).join(' ')}]`);
      }
      return `${c.id}\n  ${parts.join('\n  ')}`;
    });
    expect(cases).toHaveLength(130);
    await expect(lines.join('\n') + '\n').toMatchFileSnapshot('./__snapshots__/trame-actuelle.txt');
  });

  it('la table FACH_COVERS', async () => {
    const sorted = Object.entries(FACH_COVERS).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k} -> ${v.join(', ')}`);
    await expect(sorted.join('\n') + '\n').toMatchFileSnapshot('./__snapshots__/fach-covers.txt');
  });
});
