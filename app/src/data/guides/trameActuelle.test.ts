import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { playedTrame } from './anamneseChapters';
import { phraseFollowUp, phraseIsCaseSpecific, phraseProbes, type Phrase } from './phrases';

// Gel de la trame JOUÉE (ADR-0023). K0 l'a gravé sur l'ancien montage (FACH_COVERS + dedupeBySymptom) ; K3 le
// régénère sur le moteur de cohérence `cohere` (le diff par catégorie d'écart est au rapport K3). Un lot qui change
// la trame jouée d'un cas le régénère — `vitest -u` — et le diff du commit dit quels cas ont bougé.
//
// Ce qui est gelé, c'est la STRUCTURE de la trame jouée (quelle sonde, dans quel chapitre, dans quel ordre, réduite
// ou non, détachée), pas les mots : une retouche de rédaction ne fait pas rougir.
// Les relances comptent (`↳n`, via phraseFollowUp) : une relance déplacée ou détachée par K1 / K3
// change le nombre de relances de sa mère, donc le diff du gel ; les mots d'une relance, eux, ne sont pas gelés.
const key = (p: Phrase): string => {
  const relances = phraseFollowUp(p).length ? `↳${phraseFollowUp(p).length}` : '';
  if (phraseIsCaseSpecific(p)) return `cas${relances}`;
  const probes = phraseProbes(p).join('+');
  // une question réduite par `parts` (cohere) porte le `sucht` de ce qui reste ; une relance détachée (r4a) porte son id
  const reduced = typeof p !== 'string' && p.sucht ? `~${p.sucht.join(',')}` : '';
  const detache = typeof p !== 'string' && p.detacheDe ? `^${p.detacheDe}` : '';
  return `${detache || probes || '·'}${reduced}${relances}`;
};

describe('Trame jouée gelée (cohere, 130 cas)', () => {
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

});
