// C6 — S4-6, le carnet de séances (spec 2026-10-04 « 5 · Historique », training-journal.md §1.2 r. 4).
//   INV-H1  toute entrée du journal est dans UNE séance, et une seule
//   INV-H2  une séance enchaîne ses exercices à ≤ SEANCE_PAUSE_MIN ; deux séances sont séparées de plus
//   INV-H3  la durée d'une séance est la somme des minutes MESURÉES, jamais l'écart entre son début et sa fin
//   INV-H4  cadran avant = le journal du cas AVANT la séance ; après = le même, séance comprise
//   INV-H5  « cherché N fois » : seuls les mots cherchés ≥ 2 fois PENDANT la séance, regroupés par carte
//   INV-H6  la ligne de semaine ne compte que la semaine (lundi → maintenant) ; la tendance compare au même point
//   INV-H7  « Revoir mes N oublis » = le bilan de la partie (encore manquées) ; « Rejouer » = le Teil sous 60
// Tout se dérive du journal : aucun état de séance n'est stocké.
import { describe, it, expect } from 'vitest';
import type { Favorite, SimTeil, TermeCherche, TrainingEvent } from '@/db/types';
import {
  SEANCE_PAUSE_MIN, casDeSeance, ligneSemaine, motsDeSeance, seances, tendanceSemaine, texteSemaine, type Carte,
} from '@/features/history/seances';
import { forAll } from './helpers/prop';

const MIN = 60_000;
const T0 = new Date(2026, 9, 14, 18, 0).getTime();            // mardi 14 octobre 2026, 18 h
const ev = (id: string, at: number, o: Partial<TrainingEvent> = {}): TrainingEvent =>
  ({ id, at, kind: 'simulation', teile: ['anamnese'], source: 'libre', spentMin: 20, ...o });

describe('INV-H1 / INV-H2 / INV-H3 — le regroupement en séances', () => {
  it('pour tout journal : partition, enchaînement ≤ pause, séparation > pause, minutes = Σ spentMin', async () => {
    await forAll(200, (r) => {
      const journal: TrainingEvent[] = [];
      let t = T0;
      for (let i = 0; i < r.int(0, 25); i++) {
        t += r.pick([0, 1, 5, 29, 30, 31, 45, 90, 600]) * MIN;
        journal.push(ev(`e${i}`, t, { spentMin: r.pick([0, 0, 3, 12, 25, 50]), kind: r.pick(['simulation', 'drill', 'fiche', 'aufklaerung'] as const) }));
      }
      const ss = seances(r.shuffle(journal));
      const ids = ss.flatMap((s) => s.events.map((e) => e.id));
      expect(ids.sort()).toEqual(journal.map((e) => e.id).sort());              // H1 : chacune, une fois
      for (let k = 0; k < ss.length; k++) {
        const s = ss[k];
        let fin = -Infinity;
        for (const e of s.events) {
          if (fin !== -Infinity) expect(e.at - fin).toBeLessThanOrEqual(SEANCE_PAUSE_MIN * MIN);
          fin = Math.max(fin, e.at + e.spentMin * MIN);
        }
        expect(s.fin).toBe(fin);
        expect(s.minutes).toBe(s.events.reduce((n, e) => n + e.spentMin, 0));  // H3
        if (k > 0) expect(ss[k - 1].debut - s.fin).toBeGreaterThan(SEANCE_PAUSE_MIN * MIN);   // H2 : la plus récente d'abord
      }
    });
  });

  it('exemple : 52 min de cas puis un drill 25 min après la fin → une séance ; 31 min après → deux', () => {
    const a = ev('a', T0, { spentMin: 52, caseId: 'c1' });
    expect(seances([a, ev('d', T0 + (52 + 25) * MIN, { kind: 'drill', teile: [], spentMin: 8 })])).toHaveLength(1);
    expect(seances([a, ev('d', T0 + (52 + 31) * MIN, { kind: 'drill', teile: [], spentMin: 8 })])).toHaveLength(2);
    expect(seances([a, ev('d', T0 + (52 + 30) * MIN, { kind: 'drill', teile: [], spentMin: 8 })])).toHaveLength(1);
  });
});

describe('INV-H4 — les cadrans avant et après', () => {
  it('un cas joué pour la première fois : avant vierge, après couvert d’un Teil, scores de la séance', () => {
    const vieux = ev('v', T0 - 3 * 24 * 60 * MIN, { caseId: 'c2', scores: { anamnese: 90 } });
    const p1 = ev('te-s1', T0, { caseId: 'c1', teile: ['anamnese', 'dokumentation'], scores: { anamnese: 72, dokumentation: 41 } });
    const journal = [vieux, p1];
    const [s] = seances(journal);
    const [c] = casDeSeance(s, journal);
    expect(c.caseId).toBe('c1');
    expect(c.ids).toEqual(['te-s1']);
    expect(c.avant.teile.anamnese.attempts).toBe(0);
    expect(c.apres.teile.anamnese.lastScore).toBe(72);
    expect(c.scores).toEqual({ anamnese: 72, dokumentation: 41 });
  });

  it('un cas déjà joué : avant porte le passé, pas la séance ; après la porte', () => {
    const passe = ev('te-p', T0 - 2 * 24 * 60 * MIN, { caseId: 'c1', scores: { anamnese: 50 } });
    const ici = ev('te-i', T0, { caseId: 'c1', scores: { anamnese: 85 } });
    const futur = ev('te-f', T0 + 3 * 24 * 60 * MIN, { caseId: 'c1', scores: { anamnese: 10 } });
    const journal = [passe, ici, futur];
    const s = seances(journal).find((x) => x.events.some((e) => e.id === 'te-i'))!;
    const [c] = casDeSeance(s, journal);
    expect(c.avant.teile.anamnese.lastScore).toBe(50);
    expect(c.apres.teile.anamnese.lastScore).toBe(85);                      // le futur n'entre pas
  });

  it('deux parties du même cas dans la séance : une ligne, le dernier score de chaque Teil', () => {
    const journal = [
      ev('te-1', T0, { caseId: 'c1', scores: { anamnese: 40 } }),
      ev('te-2', T0 + 25 * MIN, { caseId: 'c1', scores: { anamnese: 75 } }),
      ev('f', T0 + 50 * MIN, { kind: 'fiche', caseId: 'c1', teile: [], spentMin: 5 }),
    ];
    const cas = casDeSeance(seances(journal)[0], journal);
    expect(cas).toHaveLength(1);
    expect(cas[0].ids).toEqual(['te-1', 'te-2']);
    expect(cas[0].scores).toEqual({ anamnese: 75 });
  });
});

describe('INV-H7 — les actions d’un cas', () => {
  const partie = (id: string, caseId: string, at: number, manque: string[], score = 70, teil: SimTeil = 'anamnese') =>
    ev(id, at, { caseId, teile: [teil], scores: { [teil]: score }, manques: { [teil]: manque } });

  it('« Revoir mes N oublis » : les items encore manqués que le bilan de la partie montre', () => {
    // 3 oublis de « allergien » sur 2 cas avant la séance : un signal ; la partie de la séance le manque encore.
    const journal = [
      partie('te-a', 'c2', T0 - 5 * 24 * 60 * MIN, ['allergien', 'noxen']),
      partie('te-b', 'c3', T0 - 4 * 24 * 60 * MIN, ['allergien', 'noxen']),
      partie('te-c', 'c2', T0 - 3 * 24 * 60 * MIN, ['allergien', 'noxen']),
      partie('te-s', 'c1', T0, ['allergien']),
    ];
    const [c] = casDeSeance(seances(journal)[0], journal);
    expect(c.oublis).toEqual({ simId: 's', n: 1 });                         // noxen cochée cette fois : pas à revoir
  });

  it('aucun signal → pas d’action « Revoir »', () => {
    const journal = [partie('te-s', 'c1', T0, ['allergien'])];
    expect(casDeSeance(seances(journal)[0], journal)[0].oublis).toBeNull();
  });

  it('« Rejouer » vise le Teil le plus faible sous 60, et seulement lui', () => {
    const j1 = [ev('te-s', T0, { caseId: 'c1', teile: ['anamnese', 'fallvorstellung'], scores: { anamnese: 55, fallvorstellung: 38 } })];
    expect(casDeSeance(seances(j1)[0], j1)[0].aRejouer).toBe('fallvorstellung');
    const j2 = [ev('te-s', T0, { caseId: 'c1', teile: ['anamnese'], scores: { anamnese: 60 } })];
    expect(casDeSeance(seances(j2)[0], j2)[0].aRejouer).toBeNull();
    const j3 = [ev('te-s', T0, { caseId: 'c1', teile: ['anamnese'], scores: { anamnese: 20 }, selbstbewertet: true })];
    expect(casDeSeance(seances(j3)[0], j3)[0].aRejouer).toBeNull();          // une auto-évaluation n'est pas une mesure
  });
});

describe('INV-H5 — « Pendant cette séance »', () => {
  const cartes = new Map<string, Carte>([['fb-ikt', { id: 'fb-ikt', term: 'Ikterus' }], ['fb-asz', { id: 'fb-asz', term: 'Aszites' }], ['fb-cap', { id: 'fb-cap', term: 'Caput medusae' }]]);
  const resoudre = (t: string): Carte | null => [...cartes.values()].find((c) => c.term.toLowerCase() === t.toLowerCase()) ?? null;
  const journal = [ev('te-s', T0, { caseId: 'c1', spentMin: 52 })];
  const s = seances(journal)[0];
  const cherche = (terme: string, min: number): TermeCherche => ({ at: T0 + min * MIN, terme });
  const fav = (termId: string, min: number): Favorite => ({ termId, since: new Date(T0 + min * MIN).toISOString() });

  it('favoris posés pendant la séance (★) ; mot cherché 2 fois (à envoyer) ; 1 fois ou hors séance : rien', () => {
    const mots = motsDeSeance(s,
      [fav('fb-asz', 10), fav('fb-cap', 20), fav('fb-old', -600)],
      [cherche('Ikterus', 5), cherche('ikterus', 30), cherche('Aszites', 12), cherche('Aszites', 13), cherche('Ikterus', -120), cherche('Ikterus', 52 + SEANCE_PAUSE_MIN + 1), cherche('Unbekannt', 1), cherche('Unbekannt', 2)],
      resoudre, cartes);
    expect(mots).toEqual([
      { termId: 'fb-asz', terme: 'Aszites', favori: true, cherche: 2 },
      { termId: 'fb-cap', terme: 'Caput medusae', favori: true, cherche: 0 },
      { termId: 'fb-ikt', terme: 'Ikterus', favori: false, cherche: 2 },
    ]);
  });

  it('un seul « Ikterus » cherché pendant la séance ne suffit pas', () => {
    expect(motsDeSeance(s, [], [cherche('Ikterus', 5)], resoudre, cartes)).toEqual([]);
  });
});

describe('INV-H6 — la ligne de semaine', () => {
  const lundi = new Date(2026, 9, 12, 9, 0).getTime();
  const maintenant = new Date(2026, 9, 14, 21, 0).getTime();               // mardi soir
  const J = 24 * 60 * MIN;

  it('compte les cas, les Teile passés à « acquis » et les Fachbegriffe révisés de la semaine, rien d’autre', () => {
    const journal = [
      ev('te-0', lundi - 3 * J, { caseId: 'c9', scores: { anamnese: 90 } }),                     // semaine passée
      ev('te-1', lundi, { caseId: 'c1', scores: { anamnese: 72 } }),                             // acquis cette semaine
      ev('te-2', lundi + J, { caseId: 'c2', teile: ['anamnese', 'dokumentation'], scores: { anamnese: 40, dokumentation: 85 } }),
      ev('te-3', lundi + J, { caseId: 'c9', scores: { anamnese: 95 } }),                         // déjà acquis avant : ne compte pas
      ev('d', lundi + J, { kind: 'drill', teile: [], spentMin: 9 }),
    ];
    const revus = [
      { subject_id: 'fb-1', occurred_at: new Date(lundi + 60 * MIN).toISOString() },
      { subject_id: 'fb-1', occurred_at: new Date(lundi + J).toISOString() },
      { subject_id: 'fb-2', occurred_at: new Date(lundi + J).toISOString() },
      { subject_id: 'fb-3', occurred_at: new Date(lundi - J).toISOString() },
    ];
    const l = ligneSemaine(journal, revus, maintenant);
    expect(l).toMatchObject({ cas: 3, teilesAcquis: 2, fachbegriffe: 2 });
    expect(texteSemaine(l)).toBe('Cette semaine : 3 cas, 2 Teile acquis, 2 Fachbegriffe révisés.');
  });

  it('la tendance compare au même point de la semaine dernière (lundi → mardi 21 h)', () => {
    const journal = [
      ev('a', lundi - 7 * J, { caseId: 'c1' }),
      ev('b', lundi - 6 * J, { caseId: 'c2' }),
      ev('c', lundi - 4 * J, { caseId: 'c3' }),                                                   // jeudi dernier : après le même point
      ev('d', lundi + J, { caseId: 'c4' }),
    ];
    const l = ligneSemaine(journal, [], maintenant);
    expect(l).toMatchObject({ cas: 1, casSemaineDerniere: 2 });
    expect(tendanceSemaine(l)).toEqual({ sens: 'baisse', texte: '1 cas de moins qu’à ce stade la semaine dernière' });
    expect(tendanceSemaine({ ...l, cas: 4 })).toEqual({ sens: 'hausse', texte: '2 cas de plus qu’à ce stade la semaine dernière' });
    expect(tendanceSemaine({ ...l, cas: 0, casSemaineDerniere: 0 })).toBeNull();
  });

  it('semaine vide : une phrase, sans zéro', () => {
    expect(texteSemaine(ligneSemaine([], [], maintenant))).toBe('Cette semaine : pas encore de séance.');
  });
});
