import { describe, it, expect } from 'vitest';
import type { ChecklistItem, PartResult } from '@/db/types';
import { ZUSTAENDE, type Lauf, type LaufZustand } from './types';
import {
  erstelleLauf, transition, istVollstaendig, naechsterTeil, zustandIndex,
  minutenProTeil, checklisteFuer, setzeChecklistItem, setzeEntwurf, tickChrono,
  erlaubt, simulationBeendbar, bewerte, aktualisiereTeil, type LaufAktion,
} from './automat';
import { NOT_ENTERED, isEntered, partScore, scoreBasis } from '@/lib/scoring';

// ============================================================================
// Contrat : docs/contracts/simulation-run.md §2 et §7 (INV-20, 21, 25, 26, 28).
// Le bug racine qu'on verrouille ici : `SimulationRunner.tsx:189-190`,
// `if (idx < flow.length - 1)`. En Teil seul `flow.length === 1`, donc
// « Valider » ne faisait que réafficher l'exercice terminé.
// ============================================================================

const CL = (id: string, label = id): ChecklistItem => ({ id, label, checked: false });
const MODELE: ChecklistItem[] = [
  CL('anam-eroeffnung'), CL('anam-personalia'),
  CL('doku-anrede'), CL('doku-konjunktiv'),
  CL('fall-begruessung'),
];
const AUFK: ChecklistItem[] = [CL('aufk-einleitung'), CL('aufk-risiken')];

const base = (over: Partial<Parameters<typeof erstelleLauf>[0]> = {}) =>
  erstelleLauf({
    caseId: 'c1', caseName: 'Cas 1', profileId: 'p1',
    geplanteTeile: ['anamnese', 'dokumentation', 'fallvorstellung'],
    assistance: 'assiste', layer: 1, mode: 'texte',
    ...over,
  });

const resultat = (over: Partial<PartResult> = {}): PartResult => ({
  done: true, durationSec: 60, checklist: [], feeling: 50,
  contentPct: 70, officialPct: 60, ...over,
});

/** Amène un Lauf jusqu'à `laufend(teil)` en partant de `vorbereitung`. */
const demarre = (l: Lauf, teil?: Lauf['aktuellerTeil']) =>
  transition(l, { typ: 'demarrer', teil: teil ?? undefined, checkliste: MODELE });

const TOUTES_ACTIONS: LaufAktion[] = [
  { typ: 'demarrer', checkliste: MODELE },
  { typ: 'aufklaerungOeffnen', checkliste: AUFK },
  { typ: 'terminerPartie', ergebnis: resultat() },
  { typ: 'partieSuivante' },
  { typ: 'springeZu', teil: 'dokumentation' },   // [S4] exception nommée nº 4 (§10.2.1)
  { typ: 'versChecklist' },
  { typ: 'zurueckZurPartie' },
  { typ: 'zurueckZumBilanz' },
  { typ: 'arztbriefSchreiben' },
  { typ: 'speichern' },
];

describe('INV-26 — profileId obligatoire', () => {
  it('erstelleLauf sans profileId lève', () => {
    expect(() => base({ profileId: '' })).toThrow(/profileId/i);
  });
  it('erstelleLauf pose un id stable et non vide', () => {
    const l = base();
    expect(l.id).toMatch(/[0-9a-f-]{16,}/i);
    // `demarrer` ne régénère JAMAIS l'id : c'est la clé d'idempotence (§3.2).
    expect(demarre(l).id).toBe(l.id);
  });
});

describe('INV-21 — terminerPartie mène TOUJOURS à bilanz', () => {
  it('en Teil seul (le bug racine : flow.length === 1)', () => {
    const l = demarre(base({ geplanteTeile: ['anamnese'], modus: 'teil' }));
    expect(l.zustand).toBe('laufend');
    const apres = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    expect(apres.zustand).toBe('bilanz');
    expect(apres.aktuellerTeil).toBe('anamnese');
    expect(apres.teileGespielt).toEqual(['anamnese']);
  });

  it('valider la dernière partie d’un run complet ne réaffiche jamais l’exercice terminé', () => {
    let l = demarre(base());
    for (const t of ['anamnese', 'dokumentation'] as const) {
      expect(l.aktuellerTeil).toBe(t);
      l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
      l = transition(l, { typ: 'partieSuivante' });
    }
    expect(l.aktuellerTeil).toBe('fallvorstellung');
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    // Le point exact où l'ancien runner retombait en `play` sur l'exercice fini.
    expect(l.zustand).toBe('bilanz');
    expect(l.aktuellerTeil).toBe('fallvorstellung');
  });

  it('pour les trois Teile pris isolément', () => {
    for (const t of ['anamnese', 'dokumentation', 'fallvorstellung'] as const) {
      const l = demarre(base({ geplanteTeile: [t], modus: 'teil' }));
      expect(transition(l, { typ: 'terminerPartie', ergebnis: resultat() }).zustand).toBe('bilanz');
    }
  });
});

describe('INV-20 — aucune transition vers un état antérieur', () => {
  // Table EXHAUSTIVE : 6 états × 8 actions. Une transition refusée doit
  // retourner LA MÊME RÉFÉRENCE — ce qui interdit toute mutation silencieuse.
  const parZustand: Record<LaufZustand, () => Lauf> = {
    vorbereitung: () => base(),
    laufend: () => demarre(base()),
    bilanz: () => transition(demarre(base()), { typ: 'terminerPartie', ergebnis: resultat() }),
    checkliste: () => {
      let l = demarre(base({ geplanteTeile: ['anamnese'], modus: 'teil' }));
      l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
      return transition(l, { typ: 'versChecklist' });
    },
    arztbrief: () => {
      let l = parZustand.checkliste();
      return transition(l, { typ: 'arztbriefSchreiben' });
    },
    gespeichert: () => transition(parZustand.checkliste(), { typ: 'speichern' }),
  };

  const ATTENDU: Record<LaufZustand, Record<LaufAktion['typ'], LaufZustand>> = {
    vorbereitung: {
      demarrer: 'laufend', aufklaerungOeffnen: 'vorbereitung', terminerPartie: 'vorbereitung',
      partieSuivante: 'vorbereitung', springeZu: 'vorbereitung', versChecklist: 'vorbereitung', zurueckZumBilanz: 'vorbereitung', zurueckZurPartie: 'vorbereitung',
      arztbriefSchreiben: 'vorbereitung', speichern: 'vorbereitung',
    },
    laufend: {
      demarrer: 'laufend', aufklaerungOeffnen: 'laufend', terminerPartie: 'bilanz',
      partieSuivante: 'laufend', springeZu: 'laufend', versChecklist: 'laufend', zurueckZumBilanz: 'laufend', zurueckZurPartie: 'laufend',
      arztbriefSchreiben: 'laufend', speichern: 'laufend',
    },
    bilanz: {
      demarrer: 'bilanz', aufklaerungOeffnen: 'bilanz', terminerPartie: 'bilanz',
      partieSuivante: 'laufend', springeZu: 'bilanz', versChecklist: 'checkliste', zurueckZumBilanz: 'bilanz', zurueckZurPartie: 'laufend',
      arztbriefSchreiben: 'bilanz', speichern: 'bilanz',
    },
    checkliste: {
      demarrer: 'checkliste', aufklaerungOeffnen: 'checkliste', terminerPartie: 'checkliste',
      partieSuivante: 'checkliste', springeZu: 'checkliste', versChecklist: 'checkliste', zurueckZumBilanz: 'bilanz', zurueckZurPartie: 'checkliste',
      arztbriefSchreiben: 'arztbrief', speichern: 'gespeichert',
    },
    arztbrief: {
      demarrer: 'arztbrief', aufklaerungOeffnen: 'arztbrief', terminerPartie: 'arztbrief',
      partieSuivante: 'arztbrief', springeZu: 'arztbrief', versChecklist: 'arztbrief', zurueckZumBilanz: 'arztbrief', zurueckZurPartie: 'arztbrief',
      arztbriefSchreiben: 'arztbrief', speichern: 'gespeichert',
    },
    gespeichert: {
      demarrer: 'gespeichert', aufklaerungOeffnen: 'gespeichert', terminerPartie: 'gespeichert',
      partieSuivante: 'gespeichert', springeZu: 'gespeichert', versChecklist: 'gespeichert', zurueckZumBilanz: 'gespeichert', zurueckZurPartie: 'gespeichert',
      arztbriefSchreiben: 'gespeichert', speichern: 'gespeichert',
    },
  };

  for (const z of ZUSTAENDE) {
    for (const aktion of TOUTES_ACTIONS) {
      it(`${z} + ${aktion.typ} → ${ATTENDU[z][aktion.typ]}`, () => {
        const avant = parZustand[z]();
        expect(avant.zustand).toBe(z);
        const apres = transition(avant, aktion);
        expect(apres.zustand).toBe(ATTENDU[z][aktion.typ]);
        // Refusée ⇒ objet inchangé, à la référence près.
        if (ATTENDU[z][aktion.typ] === z && !(z === 'laufend' && (aktion.typ === 'aufklaerungOeffnen' || aktion.typ === 'springeZu'))
            && !(z === 'bilanz' && aktion.typ === 'partieSuivante')) {
          if (apres !== avant) expect(apres).toEqual(avant);
        }
      });
    }
  }

  it('l’index d’état ne décroît jamais, sauf par zurueckZurPartie', () => {
    let l = demarre(base({ geplanteTeile: ['anamnese'], modus: 'teil' }));
    const suite: LaufAktion[] = [
      { typ: 'terminerPartie', ergebnis: resultat() },
      { typ: 'versChecklist' },
      { typ: 'speichern' },
    ];
    let prev = zustandIndex(l.zustand);
    for (const a of suite) {
      l = transition(l, a);
      expect(zustandIndex(l.zustand)).toBeGreaterThanOrEqual(prev);
      prev = zustandIndex(l.zustand);
    }
  });

  it('partieSuivante est refusée sur le dernier Teil — seul versChecklist sort', () => {
    let l = demarre(base({ geplanteTeile: ['anamnese'], modus: 'teil' }));
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    const refus = transition(l, { typ: 'partieSuivante' });
    expect(refus).toBe(l);
    expect(transition(l, { typ: 'versChecklist' }).zustand).toBe('checkliste');
  });

  it('zurueckZurPartie n’est disponible QUE depuis bilanz, et vers le Teil courant', () => {
    let l = demarre(base());
    expect(transition(l, { typ: 'zurueckZurPartie' })).toBe(l);   // depuis laufend : refusée
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    const retour = transition(l, { typ: 'zurueckZurPartie' });
    expect(retour.zustand).toBe('laufend');
    expect(retour.aktuellerTeil).toBe('anamnese');
  });
});

describe('décision 8 — zurueckZumBilanz : depuis la checklist de fin, on revient au bilan', () => {
  it('run complet tronqué par erreur : retour au bilan de la dernière partie, puis Partie suivante', () => {
    let l = demarre(base());
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'versChecklist' });
    expect(l.zustand).toBe('checkliste');
    l = transition(l, { typ: 'zurueckZumBilanz' });
    expect(l.zustand).toBe('bilanz');
    expect(l.aktuellerTeil).toBe('anamnese');
    l = transition(l, { typ: 'partieSuivante' });
    expect(l.zustand).toBe('laufend');
    expect(l.aktuellerTeil).toBe('dokumentation');
  });
  it('deux parties jouées : retour au bilan de la DERNIÈRE, pas de la première', () => {
    let l = demarre(base());
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'partieSuivante' });
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(transition(l, { typ: 'versChecklist' }), { typ: 'zurueckZumBilanz' });
    expect(l.zustand).toBe('bilanz');
    expect(l.aktuellerTeil).toBe('dokumentation');
  });

  it('la checklist cochée survit à l’aller-retour checkliste → bilan', () => {
    let l = demarre(base());
    l = setzeChecklistItem(l, 'anam-eroeffnung', true);
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    const avant = transition(l, { typ: 'versChecklist' });
    const apres = transition(avant, { typ: 'zurueckZumBilanz' });
    expect(apres.checkliste).toBe(avant.checkliste);
    expect(apres.checkliste.find((i) => i.id === 'anam-eroeffnung')?.checked).toBe(true);
    expect(apres.teile).toBe(avant.teile);
    expect(apres.sekundenProTeil).toBe(avant.sekundenProTeil);
  });

  it('refusé hors de checkliste (arztbrief compris)', () => {
    let l = demarre(base({ geplanteTeile: ['anamnese'], modus: 'teil' }));
    expect(transition(l, { typ: 'zurueckZumBilanz' })).toBe(l);
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(transition(l, { typ: 'versChecklist' }), { typ: 'arztbriefSchreiben' });
    expect(transition(l, { typ: 'zurueckZumBilanz' })).toBe(l);
  });
});

describe('I1 — « Terminer la simulation » n’est visible qu’au bilan (mineur 2)', () => {
  it('pendant une partie en cours, même avec une partie déjà jouée : absent', () => {
    let l = demarre(base());
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'partieSuivante' });
    expect(l.zustand).toBe('laufend');
    expect(l.teileGespielt.length).toBe(1);
    expect(simulationBeendbar(l)).toBe(false);
  });
  it('au bilan : présent ; à la checklist de fin : absent', () => {
    let l = demarre(base());
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    expect(simulationBeendbar(l)).toBe(true);
    expect(simulationBeendbar(transition(l, { typ: 'versChecklist' }))).toBe(false);
  });
});

describe('Q5 — l’Arztbrief : l’automate, pas la vue, décide s’il est proposé (mineur 1)', () => {
  it('Dokumentation jouée ⇒ arztbriefSchreiben refusé (la lettre existe déjà)', () => {
    let l = demarre(base({ geplanteTeile: ['dokumentation'], modus: 'teil' }), 'dokumentation');
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'versChecklist' });
    expect(l.zustand).toBe('checkliste');
    expect(transition(l, { typ: 'arztbriefSchreiben' })).toBe(l);
    expect(erlaubt(l, { typ: 'arztbriefSchreiben' })).toBe(false);
  });
  it('Dokumentation non jouée ⇒ proposé', () => {
    let l = demarre(base({ geplanteTeile: ['anamnese'], modus: 'teil' }));
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'versChecklist' });
    expect(erlaubt(l, { typ: 'arztbriefSchreiben' })).toBe(true);
  });
});

describe('Aufklärung — jamais de retour en dur à « anamnese »', () => {
  it('ouverte depuis dokumentation, elle y ramène', () => {
    let l = demarre(base({ geplanteTeile: ['dokumentation'], modus: 'teil' }), 'dokumentation');
    expect(l.aktuellerTeil).toBe('dokumentation');
    l = transition(l, { typ: 'aufklaerungOeffnen', checkliste: AUFK });
    expect(l.zustand).toBe('laufend');
    expect(l.aktuellerTeil).toBe('aufklaerung');
    // La checklist d'Aufklärung s'AJOUTE à celle du Lauf, sans la reconstruire.
    expect(l.checkliste.map((i) => i.id)).toEqual(expect.arrayContaining(['aufk-einleitung', 'doku-anrede']));
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    expect(l.zustand).toBe('bilanz');
    expect(l.aktuellerTeil).toBe('aufklaerung');
    l = transition(l, { typ: 'partieSuivante' });
    expect(l.aktuellerTeil).toBe('dokumentation');   // PAS 'anamnese'
    expect(l.zustand).toBe('laufend');
  });

  it('M4 — UNE Aufklärung par run : une seconde est refusée (ni chrono hérité, ni cases déjà cochées)', () => {
    let l = demarre(base());
    l = transition(l, { typ: 'aufklaerungOeffnen', checkliste: AUFK });
    l = tickChrono(l, 'aufklaerung', 240);
    l = setzeChecklistItem(l, 'aufk-einleitung', true);
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'partieSuivante' });          // retour à l'Anamnese
    expect(l.aktuellerTeil).toBe('anamnese');
    const avant = l;
    expect(transition(l, { typ: 'aufklaerungOeffnen', checkliste: AUFK })).toBe(avant);
  });

  it('une Aufklärung jouée ne rend pas le run complet', () => {
    let l = demarre(base({ geplanteTeile: ['anamnese'], modus: 'teil' }));
    l = transition(l, { typ: 'aufklaerungOeffnen', checkliste: AUFK });
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    expect(istVollstaendig(l)).toBe(false);
  });
});

describe('INV-25 — la portée jouée est un FAIT, pas une intention', () => {
  it('run déclaré complet, une seule partie jouée ⇒ pas complet', () => {
    let l = demarre(base());                       // modus 'komplett', 3 Teile planifiés
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    expect(l.modus).toBe('komplett');
    expect(istVollstaendig(l)).toBe(false);        // `simScope.ts:19-23` disait true
    expect(l.teileGespielt).toEqual(['anamnese']);
  });

  it('les trois Teile joués ⇒ complet, et teileGespielt en compte exactement trois', () => {
    let l = demarre(base());
    for (let i = 0; i < 3; i++) {
      l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
      if (i < 2) l = transition(l, { typ: 'partieSuivante' });
    }
    expect(istVollstaendig(l)).toBe(true);
    expect(l.teileGespielt).toHaveLength(3);
  });

  it('naechsterTeil rend le prochain Teil planifié non joué, puis null', () => {
    let l = demarre(base());
    // Rien n'est encore JOUÉ : le prochain non joué est le Teil courant lui-même.
    expect(naechsterTeil(l)).toBe('anamnese');
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    expect(naechsterTeil(l)).toBe('dokumentation');
    l = transition(l, { typ: 'partieSuivante' });
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'partieSuivante' });
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    expect(naechsterTeil(l)).toBeNull();
  });
});

describe('INV-28 — le chrono est monotone : jamais de redémarrage', () => {
  it('l’aller-retour bilanz → laufend → bilanz ne remet pas le chrono à zéro', () => {
    let l = demarre(base({ geplanteTeile: ['anamnese'], modus: 'teil' }));
    l = tickChrono(l, 'anamnese', 754);
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat({ durationSec: 754 }) });
    expect(l.sekundenProTeil.anamnese).toBe(754);
    l = transition(l, { typ: 'zurueckZurPartie' });
    // C'est ici que `useTimer.ts:13-20`, relancé par l'effet `:438`, repartait.
    expect(l.sekundenProTeil.anamnese).toBe(754);
    l = tickChrono(l, 'anamnese', 0);              // un chrono neuf qui remonte
    expect(l.sekundenProTeil.anamnese).toBe(754);  // ignoré : jamais décroissant
    l = tickChrono(l, 'anamnese', 800);
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat({ durationSec: 800 }) });
    expect(l.sekundenProTeil.anamnese).toBe(800);
    expect(l.teile.anamnese?.durationSec).toBe(800);
  });

  it('entrer dans le Teil suivant ne touche pas le chrono du précédent', () => {
    let l = demarre(base());
    l = tickChrono(l, 'anamnese', 600);
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat({ durationSec: 600 }) });
    l = transition(l, { typ: 'partieSuivante' });
    expect(l.sekundenProTeil.anamnese).toBe(600);
    expect(l.sekundenProTeil.dokumentation ?? 0).toBe(0);   // chrono NEUF
  });

  it('minutenProTeil est une dérivation, pas un second stockage', () => {
    let l = demarre(base());
    l = tickChrono(l, 'anamnese', 754);
    expect(minutenProTeil(l).anamnese).toBe(13);
    expect((l as unknown as Record<string, unknown>).minutenProTeil).toBeUndefined();
  });
});

describe('§4 — la checklist est un CHAMP du Lauf', () => {
  it('demarrer la crée une fois ; les transitions ne la reconstruisent jamais', () => {
    let l = demarre(base());
    l = setzeChecklistItem(l, 'anam-eroeffnung', true);
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'partieSuivante' });
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'partieSuivante' });
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'versChecklist' });
    // `PartEvaluation.tsx:16` repartait de `checked: false` en dur, ici.
    expect(l.checkliste.find((i) => i.id === 'anam-eroeffnung')?.checked).toBe(true);
  });

  it('checklisteFuer filtre par préfixe sémantique', () => {
    const l = demarre(base());
    expect(checklisteFuer(l, 'anamnese').map((i) => i.id)).toEqual(['anam-eroeffnung', 'anam-personalia']);
    expect(checklisteFuer(l, 'dokumentation').map((i) => i.id)).toEqual(['doku-anrede', 'doku-konjunktiv']);
  });

  it('setzeChecklistItem sur un id absent ne change rien', () => {
    const l = demarre(base());
    expect(setzeChecklistItem(l, 'inexistant', true)).toBe(l);
  });

  it('le contenu coché est repris dans le PartResult du Teil terminé', () => {
    let l = demarre(base({ geplanteTeile: ['anamnese'], modus: 'teil' }));
    l = setzeChecklistItem(l, 'anam-eroeffnung', true);
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    expect(l.teile.anamnese?.assistanceUsed).toBe('assiste');   // dette 8.8
  });
});

describe('§3.1 — le brouillon d’évaluation survit', () => {
  it('setzeEntwurf conserve grid, feeling et hinweise jusqu’au bilan', () => {
    let l = demarre(base({ geplanteTeile: ['anamnese'], modus: 'teil' }));
    l = setzeEntwurf(l, 'anamnese', { feeling: 72, hinweise: 3 });
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    expect(l.entwurf.anamnese?.feeling).toBe(72);
    expect(l.teile.anamnese?.hints).toBe(3);
  });
});

describe('C6-A — un ressenti jamais touché n\'est pas saisi, quel que soit le chemin du brouillon', () => {
  it('indice consulté pendant l\'Anamnese (brouillon créé par `hinweise`), bilan sans toucher au ressenti : contenu seul', () => {
    let l = base({ geplanteTeile: ['anamnese'] });
    l = setzeChecklistItem(l, 'anam-eroeffnung', true);
    l = setzeEntwurf(l, 'anamnese', { hinweise: 1 });                 // le guide compte l'indice AVANT le bilan
    expect(l.entwurf.anamnese!.feeling).toBe(NOT_ENTERED);
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    const r = bewerte(aktualisiereTeil(l, 'anamnese'), 'anamnese');
    expect(isEntered(r.feeling)).toBe(false);
    expect(scoreBasis(r)).toEqual(['contenu']);
    expect(partScore(r)).toBe(r.contentPct);
  });
  it('aucun brouillon du tout : même résultat', () => {
    const r = bewerte(base({ geplanteTeile: ['anamnese'] }), 'anamnese');
    expect(r.feeling).toBe(NOT_ENTERED);
    expect(r.languageGrid && Object.values(r.languageGrid).every((v) => v === NOT_ENTERED)).toBe(true);
  });
});
