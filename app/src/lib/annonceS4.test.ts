// L'annonce unique des changements rétroactifs (simulation-run.md §10.7, décision (f)).
import { describe, it, expect } from 'vitest';
import { addDays } from 'date-fns';
import { annoncesEnAttente, teilesRedevenusAcquis, type SujetAnnonce } from '@/lib/annonceS4';
import { DATE_NOUVELLE_REGLE } from '@/lib/program/parametres';
import type { SimTeil, TrainingEvent } from '@/db/types';

const fin = new Date(`${DATE_NOUVELLE_REGLE}T00:00:00`).getTime();        // minuit local du jour du changement
const jour = (n: number, h = 10) => addDays(new Date(fin), n).setHours(h);   // n jours avant (négatif) ou après la date
let k = 0;
const ev = (caseId: string, at: number, scores: Partial<Record<SimTeil, number>>): TrainingEvent =>
  ({ id: `e${++k}`, at, kind: 'simulation', caseId, teile: Object.keys(scores) as SimTeil[], source: 'libre', spentMin: 5, scores });
const vues = new Set<SujetAnnonce>();
const tous = { teile: true, mode: true, muster: true };

describe('Teile solides redevenus acquis', () => {
  it('une réussite unique ≥ 80 avant le changement : solide hier, acquis aujourd’hui — comptée', () => {
    expect(teilesRedevenusAcquis([ev('c1', jour(-5), { anamnese: 90, dokumentation: 85 })])).toEqual({ teile: 2, cas: 1 });
  });
  it('deux réussites espacées : toujours solide, rien à annoncer', () => {
    expect(teilesRedevenusAcquis([ev('c1', jour(-9), { anamnese: 90 }), ev('c1', jour(-5), { anamnese: 90 })]).teile).toBe(0);
  });
  it('un Teil qui n’était pas solide (fragile, acquis) n’est pas annoncé', () => {
    expect(teilesRedevenusAcquis([ev('c1', jour(-5), { anamnese: 50, dokumentation: 70 })]).teile).toBe(0);
  });
  it('une partie JOUÉE après le changement n’est pas un effet du changement', () => {
    expect(teilesRedevenusAcquis([ev('c1', jour(2), { anamnese: 95 })]).teile).toBe(0);
  });
  it('redevenu solide depuis (nouvelle réussite à 3 jours ou plus) : plus rien à annoncer', () => {
    expect(teilesRedevenusAcquis([ev('c1', jour(-5), { anamnese: 90 }), ev('c1', jour(1), { anamnese: 90 })]).teile).toBe(0);
  });
  it('une séance auto-déclarée n’est jamais solide, donc jamais annoncée', () => {
    expect(teilesRedevenusAcquis([{ ...ev('c1', jour(-5), { anamnese: 95 }), selbstbewertet: true }]).teile).toBe(0);
  });
});

describe('annoncesEnAttente', () => {
  const solide = [ev('c1', jour(-5), { anamnese: 90 })];
  it('un candidat neuf n’a rien à qui annoncer', () => expect(annoncesEnAttente({ events: [], vues })).toEqual([]));
  it('annonce les Teile, au singulier puis au pluriel, sans jamais parler du jury', () => {
    const [un] = annoncesEnAttente({ events: solide, vues });
    expect(un.sujet).toBe('teile');
    const date = new Date(`${DATE_NOUVELLE_REGLE}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    expect(un.titre).toBe('« Solide » se confirme maintenant en deux fois');
    expect(un.texte).toBe(`Un Teil devient solide quand tu refais 80 ou plus au moins trois jours après une première réussite : la première peut tenir à un cas encore frais, la seconde montre qu'il tient. Un de tes Teile repasse donc à « acquis ». Une nouvelle partie à 80 ou plus le confirmera. Ta frise garde son passé : la marche du ${date} vient de cette règle, pas d'un recul.`);
    const [deux] = annoncesEnAttente({ events: [ev('c1', jour(-5), { anamnese: 90, dokumentation: 90 }), ev('c2', jour(-4), { fallvorstellung: 88 })], vues });
    expect(deux.texte).toContain('3 de tes Teile repassent donc à « acquis ». Pour la plupart, une nouvelle partie à 80 ou plus suffit.');
    for (const a of [un, deux]) expect(`${a.titre} ${a.texte}`).not.toMatch(/jury|officiel|règle FSP|Bestanden/i);
  });
  it('une fois fermée sur cet appareil, elle ne revient pas', () => {
    expect(annoncesEnAttente({ events: solide, vues: new Set<SujetAnnonce>(['teile']) })).toEqual([]);
  });
  it('`mode` et `muster` ne parlent d’un changement qu’une fois livré (gardes) — et que s’il s’applique', () => {
    const entree = { events: [], vues, config: { modus: 'teil-first' as const }, musterLocal: 'Stuttgart' };
    expect(annoncesEnAttente(entree).map((a) => a.sujet)).toEqual(['mode']);               // gardes par défaut : S4-2 livré (mode), S4-3 pas encore (muster)
    expect(annoncesEnAttente({ ...entree, actifs: tous }).map((a) => a.sujet)).toEqual(['mode', 'muster']);
    expect(annoncesEnAttente({ ...entree, config: { modus: 'cas-complet' }, musterLocal: 'Standard', actifs: tous })).toEqual([]);
    expect(annoncesEnAttente({ ...entree, config: { strategy: 'teil-first' }, musterLocal: null, actifs: tous }).map((a) => a.sujet)).toEqual(['mode']);   // lecture tolérante de l'ancien réglage
    expect(annoncesEnAttente({ ...entree, vues: new Set<SujetAnnonce>(['mode', 'muster']), actifs: tous })).toEqual([]);
  });
});
