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
    'gesäß', 'rücken', 'hals', 'unterkiefer', 'kiefer', 'brustkorb', 'brust', 'oberbauch', 'bauch', 'hoden', 'flanke',
    'wade', 'oberschenkel', 'ellenbogen'];
  const ARM_ = ['arm', 'hand', 'finger', 'daumen', 'schulter', 'nacken', 'ellenbogen'];
  const BEIN_ = ['bein', 'knie', 'fuß', 'zehe', 'hüfte', 'leiste', 'gesäß', 'wade', 'oberschenkel'];
  const ERLAUBT: Record<string, string[]> = {
    obere: ARM_, hws: [...ARM_, 'kopf'], untere: BEIN_, lws: [...BEIN_, 'rücken'], bws: ['brustkorb', 'brust', 'rücken', 'bauch'],
    thorax: ['arm', 'hals', 'unterkiefer', 'kiefer', 'rücken', 'schulter', 'oberbauch', 'brust', 'ellenbogen'],
    abdomen: ['rücken', 'leiste', 'schulter', 'hoden', 'flanke', 'bein', 'gesäß'],
  };
  // Préfixes de composé : Unterarm, Oberarm, Hinterkopf… (« Oberbauch » est son propre territoire, pas « bauch »).
  const nommes = (txt: string) => {
    const hits = TERRITOIRES.filter((t) => new RegExp(`(?<![a-zäöüß])(?:unter|ober|hinter|vorder)?${t}`, 'i').test(txt));
    return hits.includes('oberbauch') ? hits.filter((t) => t !== 'bauch') : hits;
  };
  const irradiations = (c: (typeof cases)[number]) => played(c).filter((q) =>
    phraseProbes(q).some((p) => IRRADIATION.includes(p)) || (typeof q !== 'string' && q.caseSpecific && /\bstrahl(t|en)\b|ausstrahl|\bzieht\b/i.test(phraseText(q))));
  const avecRegion = cases.filter((c) => c.patientSheet.motiv?.region);

  it('le détecteur voit les composés : Unterarm, Oberarm, Oberschenkel, Brust, Wade, Ellenbogen', () => {
    expect(nommes('Strahlen die Schmerzen in den Unterarm aus?')).toContain('arm');
    expect(nommes('Strahlen die Schmerzen in den Oberarm aus?')).toContain('arm');
    expect(nommes('Zieht der Schmerz in den Oberschenkel?')).toContain('oberschenkel');
    expect(nommes('Strahlt es in die Brust, die Wade oder den Ellenbogen?')).toEqual(expect.arrayContaining(['brust', 'wade', 'ellenbogen']));
    expect(nommes('Strahlt es in den Oberbauch?')).toEqual(['oberbauch']);
    expect(nommes('Spüren Sie es warm im Bauch?')).toEqual(['bauch']);
  });
  it('13+ cas déclarent une région et jouent des irradiations (la garde n’est pas vide)', () => {
    expect(avecRegion.length).toBeGreaterThanOrEqual(13);
    expect(avecRegion.flatMap(irradiations).length).toBeGreaterThanOrEqual(15);
  });
  it('osteoporose (bws) : une seule question d\u2019irradiation jouée, ouverte', () => {
    const c = cases.find((x) => x.id === 'case-osteoporose')!;
    const qs = irradiations(c);
    expect(qs.map(phraseText)).toEqual(['Strahlen die Schmerzen irgendwohin aus — und wenn ja, wohin?']);
    expect(nommes(allTexts(qs[0]).join(' '))).toEqual([]);
  });
  it('tout territoire nommé appartient à la région du motif', () => {
    const faux = avecRegion.flatMap((c) => irradiations(c).flatMap((q) => {
      const region = c.patientSheet.motiv!.region;
      return nommes(allTexts(q).join(' ')).filter((t) => !ERLAUBT[region].includes(t)).map((t) => `${c.id} [${region}] « ${t} » ← ${phraseText(q)}`);
    }));
    expect(faux).toEqual([]);
  });
});
