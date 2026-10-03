import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { playedTrame } from './anamneseChapters';
import { phraseAlts, phraseFollowUp, phraseProbes, phraseText, type Phrase } from './phrases';

// Série 3, lot Q0 — garde CI G1 : une question d'irradiation jouée ne nomme que
// des territoires de la région déclarée du motif.
const cases = seedCases();
const allTexts = (q: Phrase) => [phraseText(q), ...phraseAlts(q), ...phraseFollowUp(q)];
const IRRADIATION = ['akt-ausstrahlung', 'fach-ortho-ausstrahlung', 'fach-kardio-ausstrahlung', 'fach-uro-flanke'];
const played = (c: (typeof cases)[number]): Phrase[] => {
  const t = playedTrame(c);
  return [...t.chapters.flatMap((ch) => ch.questions), ...(t.fach?.chapter.questions ?? [])];
};

describe('G1 — garde « territoire ⊂ région » (motiv.region)', () => {
  // Un territoire nommé par une question d'irradiation jouée doit appartenir à
  // la région déclarée du motif : « Arm, Schulter oder Rücken » à une coxarthrose
  // suggère une douleur projetée que la fiche n'a pas. Les questions neutres
  // (« irgendwohin ») ne nomment rien et passent.
  const TERRITOIRES = ['arm', 'hand', 'finger', 'daumen', 'schulter', 'nacken', 'kopf', 'bein', 'knie', 'fuß', 'zehe', 'hüfte', 'leiste',
    'gesäß', 'rücken', 'hals', 'unterkiefer', 'kiefer', 'brustkorb', 'oberbauch', 'bauch', 'hoden', 'flanke'];
  const ARM_ = ['arm', 'hand', 'finger', 'daumen', 'schulter', 'nacken'];
  const BEIN_ = ['bein', 'knie', 'fuß', 'zehe', 'hüfte', 'leiste', 'gesäß'];
  const ERLAUBT: Record<string, string[]> = {
    obere: ARM_, hws: [...ARM_, 'kopf'], untere: BEIN_, lws: [...BEIN_, 'rücken'], bws: ['brustkorb', 'rücken', 'bauch'],
    thorax: ['arm', 'hals', 'unterkiefer', 'kiefer', 'rücken', 'schulter', 'oberbauch'],
    abdomen: ['rücken', 'leiste', 'schulter', 'hoden', 'flanke', 'bein', 'gesäß'],
  };
  const nommes = (txt: string) => TERRITOIRES.filter((t) => new RegExp(`(?<![a-zäöüß])${t}`, 'i').test(txt));
  const irradiations = (c: (typeof cases)[number]) => played(c).filter((q) =>
    phraseProbes(q).some((p) => IRRADIATION.includes(p)) || (typeof q !== 'string' && q.caseSpecific && /\bstrahl(t|en)\b|ausstrahl|\bzieht\b/i.test(phraseText(q))));
  const avecRegion = cases.filter((c) => c.patientSheet.motiv?.region);

  it('13+ cas déclarent une région et jouent des irradiations (la garde n’est pas vide)', () => {
    expect(avecRegion.length).toBeGreaterThanOrEqual(13);
    expect(avecRegion.flatMap(irradiations).length).toBeGreaterThanOrEqual(15);
  });
  it('tout territoire nommé appartient à la région du motif', () => {
    const faux = avecRegion.flatMap((c) => irradiations(c).flatMap((q) => {
      const region = c.patientSheet.motiv!.region;
      return nommes(allTexts(q).join(' ')).filter((t) => !ERLAUBT[region].includes(t)).map((t) => `${c.id} [${region}] « ${t} » ← ${phraseText(q)}`);
    }));
    expect(faux).toEqual([]);
  });
});
