import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import { checklistFor } from '@/lib/checklists';
import { erstelleLauf, transition, setzeChecklistItem, tickChrono } from './automat';
import {
  speichern, projektion, ladeAktivenLauf, speichereAktivenLauf, verwerfeAktivenLauf,
  bereinigeAltenLauf, restauriere, LAUF_AKTIV_KEY, LAUF_MAX_ALTER_MS,
} from './speichern';
import type { Lauf } from './types';
import type { Case, PartResult } from '@/db/types';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db');
  const { newId } = await import('@/lib/sync/events');
  return {
    syncQueue: {
      push: vi.fn(async (i: { type: string; subject_id: string | null; payload: unknown }) => {
        const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...i } as never;
        await db.progress_events.put(ev);
        return ev;
      }),
    },
  };
});
vi.mock('@/lib/supabase', () => ({ supabase: {}, callFn: vi.fn() }));

const c = {
  id: 'c1', name: 'Cas 1', pathology: 'x', specialty: 'X',
  linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [],
  frequency: 1, difficulty: 1,
  patientSheet: { personalia: { name: 'A', age: 1 }, leitsymptome: [], begleitsymptome: [], antworten: {}, vegetativeAnamnese: [] },
  medicalView: {},
} as unknown as Case;

const resultat = (over: Partial<PartResult> = {}): PartResult => ({
  done: true, durationSec: 600, checklist: [], feeling: 70, contentPct: 80, officialPct: 70, ...over,
});

const neuerLauf = (over: Partial<Parameters<typeof erstelleLauf>[0]> = {}) =>
  erstelleLauf({
    caseId: 'c1', caseName: 'Cas 1', profileId: 'u-mehdi',
    geplanteTeile: ['anamnese', 'dokumentation', 'fallvorstellung'],
    assistance: 'autonome', layer: 2, mode: 'texte', ...over,
  });

const alleModelle = () => [
  ...checklistFor('anamnese'), ...checklistFor('dokumentation'),
  ...checklistFor('fallvorstellung'),
];

/** Joue un Lauf jusqu'à `checkliste`. */
function spieleBisChecklist(teile: ('anamnese' | 'dokumentation' | 'fallvorstellung')[]): Lauf {
  let l = neuerLauf({ geplanteTeile: teile, modus: teile.length === 3 ? 'komplett' : 'teil' });
  l = transition(l, { typ: 'demarrer', checkliste: alleModelle() });
  for (let i = 0; i < teile.length; i++) {
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    if (i < teile.length - 1) l = transition(l, { typ: 'partieSuivante' });
  }
  return transition(l, { typ: 'versChecklist' });
}

describe('INV-22 — l’écriture finale est idempotente sur lauf.id', () => {
  beforeEach(async () => {
    await db.simulations.clear(); await db.progress_events.clear();
    await db.cases.clear(); await db.cases.put(c); await db.meta.clear();
  });

  it('trois appels ⇒ UNE ligne et UN événement', async () => {
    const l = spieleBisChecklist(['anamnese']);
    const a = await speichern(l, c);
    const b = await speichern(l, c);
    const d = await speichern(l, c);
    expect(a.id).toBe(l.id);
    expect(b.id).toBe(l.id);
    expect(d.id).toBe(l.id);
    expect(await db.simulations.count()).toBe(1);
    const evs = (await db.progress_events.toArray()).filter((e) => e.type === 'simulation.completed');
    expect(evs).toHaveLength(1);
  });

  it('deux clics CONCURRENTS ⇒ toujours une ligne et un événement', async () => {
    const l = spieleBisChecklist(['anamnese']);
    await Promise.all([speichern(l, c), speichern(l, c)]);
    expect(await db.simulations.count()).toBe(1);
    expect((await db.progress_events.toArray()).filter((e) => e.type === 'simulation.completed')).toHaveLength(1);
  });

  it('deux Läufe distincts ⇒ deux lignes (l’idempotence ne masque pas une vraie 2ᵉ partie)', async () => {
    await speichern(spieleBisChecklist(['anamnese']), c);
    await speichern(spieleBisChecklist(['anamnese']), c);
    expect(await db.simulations.count()).toBe(2);
  });

  it('l’id écrit n’est JAMAIS un `sim-<timestamp>`', async () => {
    const sim = await speichern(spieleBisChecklist(['anamnese']), c);
    expect(sim.id).not.toMatch(/^sim-\d+$/);
  });
});

describe('INV-26 — tout Lauf écrit a un profileId', () => {
  beforeEach(async () => {
    await db.simulations.clear(); await db.cases.clear(); await db.cases.put(c); await db.meta.clear();
  });

  it('restauriere ne fabrique jamais un profileId vide (M2)', () => {
    expect(restauriere({ id: 'x', caseId: 'c1' }).profileId).toBeUndefined();
  });

  it('le profileId du Lauf arrive dans la Simulation', async () => {
    const sim = await speichern(spieleBisChecklist(['anamnese']), c);
    expect(sim.profileId).toBe('u-mehdi');
    expect((await db.simulations.get(sim.id))?.profileId).toBe('u-mehdi');
  });
});

describe('§5 — la portée enregistrée est le FAIT, pas l’intention', () => {
  beforeEach(async () => {
    await db.simulations.clear(); await db.cases.clear(); await db.cases.put(c); await db.meta.clear();
  });

  it('run déclaré complet abandonné après une partie ⇒ scope "teil"', async () => {
    // Le mis-classement mesuré : `simScope.ts:19-23` répondait « complète ».
    let l = neuerLauf();
    l = transition(l, { typ: 'demarrer', checkliste: alleModelle() });
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'versChecklist' });
    const sim = await speichern(l, c);
    expect(sim.scope).toBe('teil');
    expect(sim.teil).toBe('anamnese');
  });

  it('run complet abandonné après DEUX parties ⇒ aucun `teil` : ce n’est pas « Anamnese seule »', async () => {
    let l = neuerLauf();
    l = transition(l, { typ: 'demarrer', checkliste: alleModelle() });
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'partieSuivante' });
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'versChecklist' });
    const sim = await speichern(l, c);
    expect(sim.scope).toBe('teil');
    expect(sim.teil).toBeUndefined();
    expect(Object.keys(sim.parts).sort()).toEqual(['anamnese', 'dokumentation']);
  });

  it('Teil seul + Aufklärung ⇒ `teil` reste le Teil joué (l’Aufklärung n’est pas un SimTeil)', async () => {
    let l = neuerLauf({ geplanteTeile: ['anamnese'], modus: 'teil' });
    l = transition(l, { typ: 'demarrer', checkliste: alleModelle() });
    l = transition(l, { typ: 'aufklaerungOeffnen', checkliste: checklistFor('aufklaerung') });
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'partieSuivante' });
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    l = transition(l, { typ: 'versChecklist' });
    const sim = await speichern(l, c);
    expect(sim.teil).toBe('anamnese');
  });

  it('les trois parties jouées ⇒ scope "full"', async () => {
    const sim = await speichern(spieleBisChecklist(['anamnese', 'dokumentation', 'fallvorstellung']), c);
    expect(sim.scope).toBe('full');
    expect(sim.teil).toBeUndefined();
  });
});

describe('§4 — ce qui est coché PENDANT la partie arrive dans l’historique', () => {
  it('la checklist du PartResult est celle du Lauf, jamais une liste neuve', () => {
    let l = neuerLauf({ geplanteTeile: ['anamnese'], modus: 'teil' });
    l = transition(l, { typ: 'demarrer', checkliste: alleModelle() });
    l = setzeChecklistItem(l, 'anam-vegetativ', true);
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    const cl = projektion(l, c).parts.anamnese!.checklist;
    expect(cl).toHaveLength(13);
    expect(cl.find((i) => i.id === 'anam-vegetativ')?.checked).toBe(true);
    // Aucun item d'un autre Teil ne fuit dans celui-ci.
    expect(cl.every((i) => i.id.startsWith('anam-'))).toBe(true);
  });
});

describe('INV-23 — un Lauf sérialisé puis restauré est structurellement égal', () => {
  beforeEach(async () => { await db.meta.clear(); });

  it('aller-retour par db.meta : zustand, checklist, chronos et brouillon compris', async () => {
    let l = neuerLauf();
    l = transition(l, { typ: 'demarrer', checkliste: alleModelle() });
    l = setzeChecklistItem(l, 'anam-noxen', true);
    l = tickChrono(l, 'anamnese', 931);
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat({ durationSec: 931 }) });
    l = { ...l, entwurf: { anamnese: { grid: { aussprache: 4, wortschatz: 3, grammatik: 5, redefluss: 2, kommunikation: 4 }, feeling: 66, hinweise: 2 } } };

    await speichereAktivenLauf(l);
    const wieder = await ladeAktivenLauf();
    expect(wieder).toEqual(l);
    expect(wieder!.zustand).toBe('bilanz');
    expect(wieder!.sekundenProTeil.anamnese).toBe(931);
    expect(wieder!.entwurf.anamnese?.feeling).toBe(66);
    expect(wieder!.checkliste.find((i) => i.id === 'anam-noxen')?.checked).toBe(true);
  });

  it('un Lauf terminé n’est plus proposé à la reprise', async () => {
    const l = transition(spieleBisChecklist(['anamnese']), { typ: 'speichern' });
    await speichereAktivenLauf(l);
    expect(await ladeAktivenLauf()).toBeNull();
  });

  it('speichern() efface le Lauf actif — aucune reprise fantôme', async () => {
    await db.cases.clear(); await db.cases.put(c); await db.simulations.clear();
    const l = spieleBisChecklist(['anamnese']);
    await speichereAktivenLauf(l);
    await speichern(l, c);
    expect(await db.meta.get(LAUF_AKTIV_KEY)).toBeUndefined();
    expect(await ladeAktivenLauf()).toBeNull();
  });

  it('restauriere complète un Lauf incomplet et traduit les ids legacy', () => {
    const l = restauriere({
      id: 'x', caseId: 'c1',
      checkliste: [{ id: 'cl-3', label: 'Vegetative Anamnese abgefragt', checked: true }],
    });
    expect(l.checkliste[0].id).toBe('anam-vegetativ');
    expect(l.checkliste[0].checked).toBe(true);
    expect(l.zustand).toBe('vorbereitung');
    expect(l.teileGespielt).toEqual([]);
  });

  // `restauriere` ne vaut que si la REPRISE y passe. Tant qu'elle n'était
  // appelée que par son propre test, un Lauf écrit par une version antérieure
  // revenait brut : champs manquants et ids de checklist legacy intacts.
  it('la reprise passe par restauriere : un Lauf valide aux ids legacy revient traduit', async () => {
    const l = transition(neuerLauf(), { typ: 'demarrer', checkliste: alleModelle() });
    await db.meta.put({ key: LAUF_AKTIV_KEY, value: {
      ...l, checkliste: [{ id: 'cl-3', label: 'Vegetative Anamnese abgefragt', checked: true }],
      entwurf: undefined, notes: undefined,
    } } as never);
    const wieder = await ladeAktivenLauf();
    expect(wieder!.checkliste[0].id).toBe('anam-vegetativ');
    expect(wieder!.checkliste[0].checked).toBe(true);
    expect(wieder!.entwurf).toEqual({});      // champ facultatif absent → neutre
  });

  // Mineur 11 : un Lauf d'ancien format n'est pas repris comme un run VIDE
  // (`geplanteTeile: []`, rien à jouer) — il est écarté, et nettoyé.
  it('un Lauf d’ancien format (sans geplanteTeile) est écarté et supprimé', async () => {
    await db.meta.put({ key: LAUF_AKTIV_KEY, value: {
      id: 'legacy-1', caseId: 'c1', zustand: 'laufend', aktuellerTeil: 'anamnese',
      checkliste: [{ id: 'cl-3', label: 'Vegetative Anamnese abgefragt', checked: true }],
    } } as never);
    expect(await ladeAktivenLauf()).toBeNull();
    expect(await db.meta.get(LAUF_AKTIV_KEY)).toBeUndefined();
  });

  it('P4 — un Lauf corrompu (checkliste: {}) est écarté, sans lever', async () => {
    const l = transition(neuerLauf(), { typ: 'demarrer', checkliste: alleModelle() });
    await db.meta.put({ key: LAUF_AKTIV_KEY, value: { ...l, checkliste: {} } } as never);
    expect(await ladeAktivenLauf()).toBeNull();
    expect(await db.meta.get(LAUF_AKTIV_KEY)).toBeUndefined();
  });

  it('un zustand inconnu est écarté', async () => {
    const l = transition(neuerLauf(), { typ: 'demarrer', checkliste: alleModelle() });
    await db.meta.put({ key: LAUF_AKTIV_KEY, value: { ...l, zustand: 'play' } } as never);
    expect(await ladeAktivenLauf()).toBeNull();
  });
});

describe('§3.1 — un Lauf abandonné depuis plus de 24 h', () => {
  beforeEach(async () => {
    await db.meta.clear(); await db.simulations.clear();
    await db.cases.clear(); await db.cases.put(c);
  });

  it('avec au moins un Teil joué : il est écrit, pas perdu', async () => {
    let l = neuerLauf();
    l = transition(l, { typ: 'demarrer', checkliste: alleModelle() });
    l = transition(l, { typ: 'terminerPartie', ergebnis: resultat() });
    await speichereAktivenLauf({ ...l, startedAt: Date.now() - LAUF_MAX_ALTER_MS - 1 });
    expect(await bereinigeAltenLauf()).toBeNull();
    expect(await db.simulations.count()).toBe(1);
  });

  it('sans aucun Teil joué : il est simplement supprimé', async () => {
    const l = transition(neuerLauf(), { typ: 'demarrer', checkliste: alleModelle() });
    await speichereAktivenLauf({ ...l, startedAt: Date.now() - LAUF_MAX_ALTER_MS - 1 });
    expect(await bereinigeAltenLauf()).toBeNull();
    expect(await db.simulations.count()).toBe(0);
    expect(await ladeAktivenLauf()).toBeNull();
  });

  it('récent : il est rendu tel quel, pour être repris', async () => {
    const l = transition(neuerLauf(), { typ: 'demarrer', checkliste: alleModelle() });
    await speichereAktivenLauf(l);
    expect((await bereinigeAltenLauf())?.id).toBe(l.id);
  });

  it('verwerfeAktivenLauf est sans effet s’il n’y a rien', async () => {
    await verwerfeAktivenLauf();
    expect(await ladeAktivenLauf()).toBeNull();
  });
});

describe('§3.1 — la suppression de fin ne peut pas être doublée', () => {
  beforeEach(async () => {
    await db.meta.clear(); await db.simulations.clear();
    await db.cases.clear(); await db.cases.put(c);
  });

  // Défaut MESURÉ EN NAVIGATEUR avant correction : le runner persiste à chaque
  // frappe sans attendre (`void speichereAktivenLauf(...)`). Une écriture
  // partie juste avant la fin de partie atterrissait APRÈS le
  // `db.meta.delete` de `speichern()` : `lauf.aktiv` restait en
  // `zustand: 'laufend'` avec l'id d'une partie déjà enregistrée, et rouvrir
  // le cas reprenait un run terminé.
  //
  // `fake-indexeddb` résout ses écritures en quelques microtâches : une course
  // reproduite « au chronomètre » passe AUSSI sans le correctif — vérifié, et
  // c'est pourquoi ce test ne chronomètre rien. La VANNE retient EN VOL la
  // PREMIÈRE écriture de `lauf.aktiv` et laisse passer les suivantes : sans la
  // file, l'écriture émise en premier atterrit donc en dernier, ce qui est
  // exactement le doublon mesuré en navigateur. Avec la file, les suivantes
  // attendent derrière elle et l'ordre d'émission tient.
  //
  // Discrimination vérifiée : `enfile` remplacé par `(op) => op()`, les deux
  // tests ci-dessous échouent ; rétabli, ils passent.
  const vanne = () => {
    let ouvrir!: () => void;
    const ouverte = new Promise<void>((r) => { ouvrir = r; });
    let premiere = true;
    const vrai = db.meta.put.bind(db.meta);
    // `as never` : Dexie rend une `PromiseExtended`, la doublure une `Promise`
    // nue. La différence ne porte que sur `.timeout()`, que personne n'appelle
    // ici — la faire porter au mock demanderait de réimplémenter Dexie.
    const spy = vi.spyOn(db.meta, 'put').mockImplementation((async (row: { key: string }) => {
      if (row.key === LAUF_AKTIV_KEY && premiere) { premiere = false; await ouverte; }
      return vrai(row as never);
    }) as never);
    return { ouvrir: () => { ouvrir(); spy.mockRestore(); } };
  };

  const souffle = () => new Promise((r) => setTimeout(r, 50));

  it('une écriture non attendue lancée avant speichern() n’y survit pas', async () => {
    const l = spieleBisChecklist(['anamnese']);
    const v = vanne();

    void speichereAktivenLauf({ ...l, zustand: 'laufend' });  // non attendue, comme le runner
    const fin = speichern(l, c);

    await souffle();   // sans la file : la suppression a DÉJÀ eu lieu ici
    v.ouvrir();        // l'écriture retenue atterrit maintenant
    await fin;
    await souffle();

    expect(await db.meta.get(LAUF_AKTIV_KEY)).toBeUndefined();
    expect(await ladeAktivenLauf()).toBeNull();
  });

  it('les écritures concurrentes gardent leur ordre d’émission', async () => {
    const l = spieleBisChecklist(['anamnese']);
    const v = vanne();

    void speichereAktivenLauf({ ...l, zustand: 'laufend' });
    void speichereAktivenLauf({ ...l, zustand: 'bilanz' });
    const derniere = speichereAktivenLauf({ ...l, zustand: 'checkliste' });

    await souffle();
    v.ouvrir();
    await derniere;
    await souffle();

    expect((await ladeAktivenLauf())?.zustand).toBe('checkliste');
  });
});
