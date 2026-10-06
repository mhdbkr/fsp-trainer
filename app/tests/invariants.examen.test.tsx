// C6 — S4-7, l'Examen (simulation-run.md §11). Un `Lauf` ordinaire en mode examen : tirage, cas caché, ordre A → D → F,
// minuterie murale, aucune aide, une écriture, abandon et reprise selon les règles de `main`.
//   INV-E1  tirage déterministe à aléatoire injecté, bornes exactes, `null` sans cas
//   INV-E2  une pathologie pèse une fois
//   INV-E3  un cas vierge pèse ×2 ; un cas hors source prend le plancher
//   INV-E4  nom, id et spécialité du cas absents du DOM, de l'URL et de « Reprendre », avant et pendant
//   INV-E5  `springeZu` et `zurueckZurPartie` sans effet ; ordre A → D → F
//   INV-E6  fin automatique à l'échéance, `sekundenProTeil[t] ≤ cible`, onglet gelé puis visible
//   INV-E7  aucun composant d'aide monté (DOM et garde statique)
//   INV-E8  une écriture idempotente, en conditions d'examen
//   INV-E9  abandon après un Teil : écrit, « Examen interrompu » ; avant : rien
//   INV-E10 reprise après plus de 5 min : `unterbrochen`, hors conditions d'examen
//   INV-E11 une session d'examen ne détourne jamais le runner d'entraînement
//   INV-E12 `/simulation` mène à `/examen`, le menu dit « Examen », la partie est dans l'Historique
//   INV-E13 un cas avec Aufklärung l'inclut (fin du créneau de l'Anamnese, sans aide), un cas sans ne l'inclut pas
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, configure, act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate, type RouteObject } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());
configure({ asyncUtilTimeout: 10_000 });
vi.setConfig({ testTimeout: 60_000, hookTimeout: 30_000 });
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

import { db } from '@/db/db';
import { seedCases } from '@/data/seedCases';
import { freezeAt } from '@/lib/clock';
import type { Case, CaseProgress, DayPlan, LanguageGrid, Simulation, TaskInstance, TrainingEvent } from '@/db/types';
import { LANGUAGE_CRITERIA } from '@/lib/scoring';
import { conditionsExamen } from '@/lib/examen';
import { poidsTirage, tireCas, type SourceTirage } from '@/lib/examen/tirage';
import { erstelleLauf, naechsterTeil, transition, type LaufAktion } from '@/lib/lauf/automat';
import { LAUF_AKTIV_KEY, ladeAktivenLauf, speichern } from '@/lib/lauf/speichern';
import type { Lauf } from '@/lib/lauf/types';
import { useLauf } from '@/features/simulation/useLauf';
import { ExamenPage } from '@/features/examen/ExamenPage';
import { EXAM_DAY_PLAN } from '@/features/examen/plan';
import { HistoriquePage } from '@/features/history/HistoriquePage';
import { ResumeSessionBar } from '@/components/ResumeSessionBar';
import { NAV } from '@/components/nav';
import { ROUTES } from '@/routes';
import { useSimSession } from '@/store/simSession';
import { rng } from './helpers/prop';
import { CORPUS, TEILE, resetTime, resetWorld } from './helpers/world';

const MIN = 60_000;
const CIBLE = EXAM_DAY_PLAN.BW.parts[0].targetSec;
const TRANSITION = EXAM_DAY_PLAN.BW.transitionSec;
const T0 = new Date(2026, 9, 6, 9, 0).getTime();

/** Trois cas COMPLETS (le Bogen lit la fiche patient) : le monde de l'Examen. */
/** Le dernier n'a pas d'Aufklärung (`probableAufklaerungIds` vide) : INV-E13. */
const SANS_AUFKLAERUNG = 'case-pneumonie';
const VOLLE = (() => { const ids = new Set([...CORPUS.slice(0, 3).map((c) => c.id), SANS_AUFKLAERUNG]); return seedCases().filter((c) => ids.has(c.id)); })();
const AUFK = EXAM_DAY_PLAN.BW.aufklaerung.targetSec;
const fall = () => VOLLE[0];

let avance: (ms: number) => number;
beforeEach(async () => {
  await resetWorld({ cases: VOLLE });
  avance = freezeAt(T0);
  useSimSession.setState({ snapshot: null, minimized: false });
  localStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
// Les écritures de `lauf.aktiv` passent par une file : on la laisse se vider, sinon un runner démonté écrirait dans le
// monde du test suivant.
afterEach(async () => { cleanup(); await ladeAktivenLauf().catch(() => null); resetTime(); vi.restoreAllMocks(); });

// ---------------------------------------------------------------- Le monde de rendu
let aller: (to: string) => void = () => {};
let ou = '';
function Sonde() { const n = useNavigate(); const l = useLocation(); aller = n; ou = `${l.pathname}${l.search}${l.hash}`; return null; }
const rendre = (entree = '/examen') => render(
  <MemoryRouter initialEntries={[entree]}>
    <Sonde />
    <Routes>
      <Route path="/examen" element={<ExamenPage />} />
      <Route path="/historique" element={<HistoriquePage />} />
      <Route path="/" element={<div>Accueil</div>} />
    </Routes>
    <ResumeSessionBar />
  </MemoryRouter>,
);
const aktiv = async () => (await db.meta.get(LAUF_AKTIV_KEY))?.value as Lauf | undefined;
const phase = () => document.querySelector('[data-examen]')?.getAttribute('data-examen-phase');
const attendsPhase = (p: string) => waitFor(() => expect(phase()).toBe(p));
async function demarre() {
  const b = await screen.findByRole('button', { name: /Démarrer l’examen/ });
  await waitFor(() => expect((b as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(b);
  await attendsPhase('anamnese');
  await waitFor(async () => expect((await aktiv())?.examen?.teilBeginn.anamnese).toBe(T0));
}
/** Avance l'horloge murale et laisse le runner la relire (son intervalle de 500 ms). */
const temps = async (ms: number, p: string) => { avance(ms); await attendsPhase(p); };
async function joueLesTrois() {
  await temps(CIBLE * 1000, 'transition');
  await temps(TRANSITION * 1000, 'dokumentation');
  await temps(CIBLE * 1000, 'transition');
  await temps(TRANSITION * 1000, 'fallvorstellung');
  await temps(CIBLE * 1000, 'bewertung');
}
const noteGrille = () => { for (const c of LANGUAGE_CRITERIA) fireEvent.change(document.getElementById(`langue-${c.key}`)!, { target: { value: '4' } }); };
const enregistrer = () => screen.getByRole('button', { name: /Enregistrer l’examen/ }) as HTMLButtonElement;
const html = () => document.body.innerHTML;
const secretsDe = (c: Case) => [c.name, c.id, c.specialty];

// ============================================================================ INV-E1 à E3 — le tirage
const cp = (caseId: string, etat: CaseProgress['etat']): CaseProgress => ({ caseId, etat } as CaseProgress);
const SOURCE: SourceTirage = {
  n: 100, parVille: {},
  pathologies: { p: { nom: 'P', total: 10, parVille: {} }, q: { nom: 'Q', total: 30, parVille: {} }, r: { nom: 'R', total: 20, parVille: {} } },
  cas: { A: 'p', B: 'q', R1: 'r', R2: 'r', R3: 'r' },
};
const c = (id: string) => ({ id, name: id, specialty: 's' } as unknown as Case);
const entame = (...ids: string[]) => new Map(ids.map((id) => [id, cp(id, 'entame')]));
const tire = (cases: Case[], r: number, progress = entame(...cases.map((x) => x.id)), journal: TrainingEvent[] = []) =>
  tireCas({ cases, journal, progress, maintenant: T0 }, () => r, SOURCE)?.id ?? null;

describe('INV-E1 — tirage déterministe, bornes exactes', () => {
  it('rng = 0 → le premier ; juste sous la borne cumulée → le premier ; à la borne → le second ; près de 1 → le dernier', () => {
    const cases = [c('A'), c('B')];                                         // poids 10 et 30 : borne à 10/40 = 0,25
    expect(tire(cases, 0)).toBe('A');
    expect(tire(cases, 0.2499)).toBe('A');
    expect(tire(cases, 0.25)).toBe('B');
    expect(tire(cases, 0.9999)).toBe('B');
  });
  it('à aléatoire égal, résultat égal ; sans cas, `null`', () => {
    const r = rng(7);
    const cases = CORPUS.slice(0, 40);
    for (let i = 0; i < 50; i++) {
      const x = r.next();
      const a = tireCas({ cases, journal: [], progress: new Map(), maintenant: T0 }, () => x);
      const b = tireCas({ cases, journal: [], progress: new Map(), maintenant: T0 }, () => x);
      expect(a?.id).toBe(b?.id);
    }
    expect(tireCas({ cases: [], journal: [], progress: new Map(), maintenant: T0 }, () => 0.5)).toBeNull();
  });
});

describe('INV-E2 — une pathologie pèse une fois', () => {
  it('trois cas de R (20) pèsent ensemble ce que pèse un cas seul de sa pathologie à 20', () => {
    const cases = [c('R1'), c('R2'), c('R3'), c('A')];
    const w = poidsTirage({ cases, journal: [], progress: entame('R1', 'R2', 'R3', 'A'), maintenant: T0 }, SOURCE);
    expect((w.get('R1') ?? 0) + (w.get('R2') ?? 0) + (w.get('R3') ?? 0)).toBeCloseTo(20, 9);
    expect(w.get('A')).toBe(10);
  });
});

describe('INV-E3 — vierge ×2, hors source au plancher', () => {
  it('le même cas pèse le double sans `CaseProgress` ou à l’état vierge ; un cas que la source ne compte pas prend le plancher', () => {
    const cases = [c('A'), c('B'), c('X')];
    const w1 = poidsTirage({ cases, journal: [], progress: entame('A', 'B', 'X'), maintenant: T0 }, SOURCE);
    const w2 = poidsTirage({ cases, journal: [], progress: new Map([['B', cp('B', 'vierge')]]), maintenant: T0 }, SOURCE);
    expect(w2.get('A')).toBe(2 * w1.get('A')!);                              // aucun CaseProgress
    expect(w2.get('B')).toBe(2 * w1.get('B')!);                              // état vierge
    expect(w1.get('X')).toBe(1);                                             // FREQUENCE_PLANCHER
  });
  it('un cas joué depuis moins de 14 jours est exclu ; s’ils le sont tous, l’exclusion est levée ; `prêt` n’exclut pas', () => {
    const joue = (caseId: string, jours: number): TrainingEvent => ({ id: `e-${caseId}`, at: T0 - jours * 24 * 60 * MIN, kind: 'simulation', caseId, teile: TEILE, source: 'libre', spentMin: 60 });
    expect(tire([c('A'), c('B')], 0, entame('A', 'B'), [joue('A', 13)])).toBe('B');
    expect(tire([c('A'), c('B')], 0, entame('A', 'B'), [joue('A', 15)])).toBe('A');
    expect(tire([c('A'), c('B')], 0, entame('A', 'B'), [joue('A', 1), joue('B', 1)])).toBe('A');
    expect(tire([c('A'), c('B')], 0, new Map([['A', cp('A', 'pret')], ['B', cp('B', 'entame')]]))).toBe('A');
  });
});

// ============================================================================ INV-E4 — le cas reste caché
describe('INV-E4 — le cas est caché avant et pendant', () => {
  it('ni nom, ni id, ni spécialité dans le DOM, l’URL ou la barre « Reprendre »', async () => {
    rendre();
    await screen.findByRole('button', { name: /Démarrer l’examen/ });
    for (const x of VOLLE) for (const s of secretsDe(x)) expect(html(), `avant : « ${s} »`).not.toContain(s);
    await demarre();
    const tire = (await aktiv())!.caseId;
    const leCas = VOLLE.find((x) => x.id === tire)!;
    for (const s of secretsDe(leCas)) { expect(html(), `pendant : « ${s} »`).not.toContain(s); expect(ou).not.toContain(s); }
    // Le candidat sort : la barre « Reprendre » le dit sans le nommer, et ramène à /examen. Sa source (le miroir de
    // session, aussi en sessionStorage) ne porte pas non plus le nom.
    act(() => aller('/'));
    expect(JSON.stringify(useSimSession.getState().snapshot)).not.toContain(leCas.name);
    const barre = await screen.findByRole('button', { name: /Reprendre/ });
    for (const s of secretsDe(leCas)) expect(html(), `barre : « ${s} »`).not.toContain(s);
    fireEvent.click(barre);
    await waitFor(() => expect(ou).toBe('/examen'));
    await attendsPhase('anamnese');
  });
});

// ============================================================================ INV-E5 — l'ordre de l'examen
describe('INV-E5 — ni saut ni retour, A → D → F', () => {
  const examen = () => transition(erstelleLauf({ caseId: 'x', assistance: 'assiste', layer: 1, examen: true }),
    { typ: 'demarrer', teil: 'fallvorstellung', checkliste: [] });
  const ergebnis = { done: true, durationSec: 60, checklist: [], feeling: -1, contentPct: 0, officialPct: 0 };
  it('un examen part de l’Anamnese, en Autonome, couche 3', () => {
    const l = examen();
    expect([l.aktuellerTeil, l.assistance, l.layer]).toEqual(['anamnese', 'autonome', 3]);
  });
  it('500 suites aléatoires : `springeZu`, `zurueckZurPartie`, Aufklärung et saut de Teil restent sans effet', () => {
    const r = rng(42);
    const actions = (l: Lauf): LaufAktion[] => [
      { typ: 'terminerPartie', ergebnis }, { typ: 'partieSuivante' }, { typ: 'partieSuivante', teil: r.pick(TEILE) },
      { typ: 'springeZu', teil: r.pick(TEILE) }, { typ: 'zurueckZurPartie' },
      { typ: 'versChecklist' }, ...(l.zustand === 'checkliste' ? [{ typ: 'zurueckZumBilanz' } as LaufAktion] : []),
    ];
    for (let k = 0; k < 500; k++) {
      let l = examen();
      for (let i = 0; i < 12; i++) {
        const a = r.pick(actions(l));
        const n = transition(l, a);
        if (a.typ === 'springeZu' || a.typ === 'zurueckZurPartie') expect(n, a.typ).toBe(l);
        if (a.typ === 'partieSuivante' && a.teil && a.teil !== naechsterTeil(l)) expect(n, `partieSuivante(${a.teil})`).toBe(l);
        l = n;
        const joues = l.teileGespielt.filter((t) => t !== 'aufklaerung');
        expect(TEILE.slice(0, joues.length), 'ordre A → D → F').toEqual(joues);
      }
    }
  });
});

// ============================================================================ INV-E6 — la minuterie murale
describe('INV-E6 — fin automatique, durée plafonnée, onglet gelé', () => {
  it('25 min sans un rendu (onglet gelé) : l’Anamnese est finie à la cible, la Dokumentation commence au retour', async () => {
    rendre();
    await demarre();
    avance(25 * MIN);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await attendsPhase('dokumentation');
    await waitFor(async () => expect((await aktiv())?.examen?.teilBeginn.dokumentation).toBeDefined());
    const l = (await aktiv())!;
    expect(l.teileGespielt.filter((t) => t !== 'aufklaerung')).toEqual(['anamnese']);
    // Le créneau de l'Anamnese (l'Aufklärung du cas comprise, INV-E13) est rendu en entier, jamais plus.
    const k = l.examen!.aufklaerung ? AUFK : 0;
    expect(l.sekundenProTeil.anamnese).toBe(CIBLE - k);
    expect((l.sekundenProTeil.anamnese ?? 0) + (l.sekundenProTeil.aufklaerung ?? 0)).toBe(CIBLE);
    expect(l.examen!.teilBeginn.dokumentation).toBe(T0 + 25 * MIN);
  });
});

// ============================================================================ INV-E7 — aucune aide
const AIDES: string[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/features/examen/aidesInterdites.json'), 'utf8'));
const sources = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? sources(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [path.join(dir, e.name)] : []);

describe('INV-E7 — aucune aide montée', () => {
  it('garde statique : aucun fichier de features/examen n’importe une aide', () => {
    const fichiers = sources(path.resolve(__dirname, '../src/features/examen'));
    expect(fichiers.length).toBeGreaterThan(0);
    expect(AIDES.length).toBeGreaterThan(5);
    for (const f of fichiers) {
      for (const [, spec] of fs.readFileSync(f, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        for (const a of AIDES) expect(spec.includes(a), `${path.basename(f)} importe ${spec}`).toBe(false);
      }
    }
  });
  it('DOM : pendant chaque Teil, une seule commande (Abandonner), aucun lien, aucune case à cocher, aucune aide', async () => {
    rendre();
    await demarre();
    const verifie = () => {
      const zone = document.querySelector('[data-examen]')!;
      expect([...zone.querySelectorAll('button')].map((b) => b.textContent?.trim())).toEqual(['Abandonner']);
      expect(zone.querySelectorAll('a, input[type="checkbox"], [role="dialog"]').length).toBe(0);
      expect(zone.textContent).not.toMatch(/Fachbegriffe|Guide|Mode focus|QR|\bIA\b|Kommunikation|Ouvrir la trame|Risiken|Probable pour ce cas/);
    };
    verifie();
    await temps(CIBLE * 1000, 'transition');
    await temps(TRANSITION * 1000, 'dokumentation');
    verifie();
    await temps(CIBLE * 1000, 'transition');
    await temps(TRANSITION * 1000, 'fallvorstellung');
    verifie();
  });
});

// ============================================================================ INV-E8 — une écriture, en conditions d'examen
describe('INV-E8 — l’examen complet s’écrit une fois, en conditions d’examen', () => {
  it('grilles A et F obligatoires ; deux clics, une ligne ; A → D → F enchaîné, Autonome, couche 3 ; journal examen-blanc', async () => {
    rendre();
    await demarre();
    await joueLesTrois();
    expect(enregistrer().disabled, 'sans grille, pas d’enregistrement').toBe(true);
    noteGrille();                                                             // Anamnese (affichée d'abord)
    expect(enregistrer().disabled, 'la Fallvorstellung manque').toBe(true);
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Auto-évaluation' })).getByRole('button', { name: /Fallvorstellung/ }));
    noteGrille();
    expect(enregistrer().disabled).toBe(false);
    const bouton = enregistrer();
    fireEvent.click(bouton);
    fireEvent.click(bouton);                                                  // double clic : l'idempotence (INV-22) tient
    await waitFor(() => expect(ou).toMatch(/^\/examen\?sim=/));
    await waitFor(async () => expect(await db.simulations.count()).toBe(1));
    const sim = (await db.simulations.toArray())[0];
    expect(sim.reihenfolge).toEqual(TEILE);
    expect([sim.enchaine, sim.assistance, sim.layer, sim.modeExamen]).toEqual([true, 'autonome', 3, true]);
    expect(conditionsExamen(sim)).toBe(true);
    const te = await db.training_events.get(`te-${sim.id}`);
    expect([te?.kind, te?.examen, te?.examenManque]).toEqual(['examen-blanc', true, []]);
    expect(await aktiv()).toBeUndefined();
    // Le résultat révèle le cas.
    await waitFor(() => expect(document.body.textContent).toContain(VOLLE.find((x) => x.id === sim.caseId)!.name));
  });
});

// ============================================================================ INV-E9 — l'abandon
describe('INV-E9 — abandon', () => {
  it('pendant l’Anamnese : rien n’est écrit', async () => {
    rendre();
    await demarre();
    fireEvent.click(screen.getByRole('button', { name: 'Abandonner' }));
    await waitFor(async () => expect(await aktiv()).toBeUndefined());
    expect(await db.simulations.count()).toBe(0);
    await screen.findByRole('button', { name: /Démarrer l’examen/ });
  });
  it('après l’Anamnese : la partie est écrite, hors conditions (`enchaine`), et l’Historique dit « Examen interrompu »', async () => {
    rendre();
    await demarre();
    await temps(CIBLE * 1000, 'transition');
    fireEvent.click(screen.getByRole('button', { name: 'Abandonner' }));
    await waitFor(async () => expect(await db.simulations.count()).toBe(1));
    const sim = (await db.simulations.toArray())[0];
    expect(sim.modeExamen).toBe(true);
    const te = await db.training_events.get(`te-${sim.id}`);
    expect(te?.kind).toBe('simulation');
    expect(te?.examenManque).toContain('enchaine');
    expect(te?.modeExamen).toBe(true);
    act(() => aller('/historique'));
    expect(await screen.findByText('Examen interrompu')).toBeTruthy();
  });
});

// ============================================================================ INV-E10, E11 — reprise, détournement (par le hook)
type Hook = ReturnType<typeof renderHook<ReturnType<typeof useLauf>, unknown>>;
const ouvre = async (examen: boolean) => {
  const h = renderHook(() => useLauf(fall(), null, undefined, examen ? { examen: true } : undefined));
  await waitFor(() => expect(h.result.current.laedt).toBe(false));
  return h;
};
const persiste = (h: Hook) => waitFor(async () => {
  const v = await aktiv();
  expect({ id: v?.id, t: v?.teileGespielt, z: v?.zustand }).toEqual({ id: h.result.current.lauf?.id, t: h.result.current.lauf?.teileGespielt, z: h.result.current.lauf?.zustand });
});
const grille = (): LanguageGrid => Object.fromEntries(LANGUAGE_CRITERIA.map((k) => [k.key, 4])) as unknown as LanguageGrid;

describe('INV-E10 — reprise après plus de 5 min', () => {
  it('l’examen repris est `unterbrochen`, et sa partie n’est pas en conditions d’examen', async () => {
    let h = await ouvre(true);
    act(() => h.result.current.stempleTeil('anamnese', T0));
    await persiste(h);
    h.unmount();
    avance(6 * MIN);
    h = await ouvre(true);
    expect(h.result.current.lauf?.examen, 'toujours un examen').toBeTruthy();
    expect(h.result.current.lauf?.unterbrochen).toBe(true);
    for (const t of TEILE) {
      if (t !== 'anamnese') act(() => h.result.current.dispatch({ typ: 'partieSuivante' }));
      act(() => h.result.current.terminerPartie());
      if (t !== 'dokumentation') act(() => h.result.current.setzeEntwurfFeld(t, { grid: grille() }));
    }
    act(() => h.result.current.versChecklist());
    let id: string | null = null;
    await act(async () => { id = await h.result.current.beenden(); });
    const sim = (await db.simulations.get(id!)) as Simulation;
    expect(conditionsExamen(sim)).toBe(false);
    expect((await db.training_events.get(`te-${sim.id}`))?.examenManque).toContain('enchaine');
  });
});

describe('INV-E11 — l’examen ne détourne pas le runner d’entraînement', () => {
  it('examen en cours, Anamnese jouée : le runner d’entraînement sur le même cas ne le reprend pas, il l’écrit et part à neuf', async () => {
    const e = await ouvre(true);
    act(() => e.result.current.terminerPartie());
    await persiste(e);
    const examenId = e.result.current.lauf!.id;
    e.unmount();
    const t = await ouvre(false);
    expect(t.result.current.lauf!.id).not.toBe(examenId);
    expect(t.result.current.lauf!.examen).toBeUndefined();
    await waitFor(async () => expect((await db.simulations.get(examenId))?.modeExamen).toBe(true));
  });
  it('et l’inverse : une partie d’entraînement en cours n’est jamais reprise comme examen', async () => {
    const t = await ouvre(false);
    await persiste(t);
    const id = t.result.current.lauf!.id;
    t.unmount();
    const e = await ouvre(true);
    expect(e.result.current.lauf!.id).not.toBe(id);
    expect(e.result.current.lauf!.examen).toBeTruthy();
  });
});

// ============================================================================ INV-E12 — navigation
describe('INV-E12 — `/simulation` mène à l’Examen, le menu le dit, l’Historique le montre', () => {
  const enfants = (ROUTES[0].children ?? []) as RouteObject[];
  it('`/simulation` redirige vers `/examen` ; l’entraînement garde `/pre` et `/run`', () => {
    const r = enfants.find((x) => x.path === 'simulation');
    const el = r?.element as { props?: { to?: string; replace?: boolean } } | undefined;
    expect(el?.props?.to).toBe('/examen');
    expect(el?.props?.replace).toBe(true);
    expect(enfants.map((x) => x.path)).toEqual(expect.arrayContaining(['examen', 'simulation/:caseId/pre', 'simulation/:caseId/run']));
  });
  it('le menu dit « Examen », à la place de « Simulation »', () => {
    expect(NAV.findIndex((n) => n.to === '/examen')).toBe(4);
    expect(NAV[4].label).toBe('Examen');
    expect(NAV.some((n) => n.to === '/simulation')).toBe(false);
  });
  it('un examen complet est dans l’Historique, nommé « Examen »', async () => {
    let l = transition(erstelleLauf({ caseId: fall().id, caseName: fall().name, assistance: 'autonome', layer: 3, examen: true }),
      { typ: 'demarrer', checkliste: [] });
    for (const [i, t] of TEILE.entries()) {
      if (i) l = transition(l, { typ: 'partieSuivante' });
      l = transition(l, { typ: 'terminerPartie', ergebnis: { done: true, durationSec: CIBLE, checklist: [], feeling: -1, contentPct: 80, officialPct: 80, ...(t !== 'dokumentation' ? { languageGrid: grille() } : {}) } });
    }
    l = transition(transition(l, { typ: 'versChecklist' }), { typ: 'speichern' });
    await speichern(l, fall());
    rendre('/historique');
    expect(await screen.findByText(fall().name)).toBeTruthy();
    expect(screen.getByText('Examen')).toBeTruthy();
  });
});

// La tâche « examen à blanc » du plan lance l'Examen sur SON cas, sans tirage (décision 6).
// ============================================================================ INV-E13 — l'Aufklärung du cas
describe('INV-E13 — l’Aufklärung du cas fait partie de l’examen, et seulement elle', () => {
  const tache = async (caseId: string) => {
    const t = { id: `t-${caseId}`, date: '2026-10-06', kind: 'examen-blanc', label: 'x', caseId, teile: TEILE, estMin: 60, creeA: T0 } as unknown as TaskInstance;
    await db.day_plans.put({ date: '2026-10-06', materializedAt: T0, mode: 'examen-blanc', seed: 's', targetMin: 60, tasks: [t] } as DayPlan);
    rendre(`/examen?task=${t.id}`);
    await demarre();
  };
  it('automate : sans acte, l’examen refuse l’Aufklärung ; avec, seulement depuis l’Anamnese, et revient à l’Anamnese', () => {
    const sans = transition(erstelleLauf({ caseId: 'x', assistance: 'autonome', layer: 3, examen: true }), { typ: 'demarrer', checkliste: [] });
    expect(transition(sans, { typ: 'aufklaerungOeffnen', checkliste: [] })).toBe(sans);
    const avec = transition(erstelleLauf({ caseId: 'x', assistance: 'autonome', layer: 3, examen: { aufklaerung: 'auf-gastroskopie' } }), { typ: 'demarrer', checkliste: [] });
    const k = transition(avec, { typ: 'aufklaerungOeffnen', checkliste: [] });
    expect(k.aktuellerTeil).toBe('aufklaerung');
    const ergebnis = { done: true, durationSec: 60, checklist: [], feeling: -1, contentPct: 0, officialPct: 0 };
    const retour = transition(transition(k, { typ: 'terminerPartie', ergebnis }), { typ: 'partieSuivante' });
    expect([retour.zustand, retour.aktuellerTeil]).toEqual(['laufend', 'anamnese']);
    const enD = transition(transition(transition(retour, { typ: 'terminerPartie', ergebnis }), { typ: 'partieSuivante' }), { typ: 'aufklaerungOeffnen', checkliste: [] });
    expect(enD.aktuellerTeil, 'pas d’Aufklärung hors de l’Anamnese').toBe('dokumentation');
  });
  it('un cas avec Aufklärung : elle occupe la fin du créneau de l’Anamnese, sans aide, et elle est écrite', async () => {
    const avec = VOLLE.find((x) => x.probableAufklaerungIds.length)!;
    await tache(avec.id);
    expect((await aktiv())!.examen!.aufklaerung).toBe(avec.probableAufklaerungIds[0]);
    await temps((CIBLE - AUFK) * 1000, 'aufklaerung');
    const zone = document.querySelector('[data-examen]')!;
    expect([...zone.querySelectorAll('button')].map((b) => b.textContent?.trim())).toEqual(['Abandonner']);
    expect(zone.querySelectorAll('a, input[type="checkbox"]').length).toBe(0);
    expect(zone.textContent).toMatch(/Klären Sie den Patienten/);
    expect(zone.textContent).not.toMatch(/Ouvrir la trame|Risiken|Probable pour ce cas|Fachbegriffe/);
    await temps(AUFK * 1000, 'transition');
    await waitFor(async () => expect((await aktiv())?.teileGespielt).toEqual(['aufklaerung', 'anamnese']));
    fireEvent.click(screen.getByRole('button', { name: 'Abandonner' }));
    await waitFor(async () => expect(await db.simulations.count()).toBe(1));
    const sim = (await db.simulations.toArray())[0];
    expect(sim.parts.aufklaerung?.done).toBe(true);
    expect(sim.reihenfolge).toEqual(['anamnese']);
  });
  it('un cas sans Aufklärung : l’Anamnese garde son créneau entier, aucune Aufklärung', async () => {
    await tache(SANS_AUFKLAERUNG);
    expect((await aktiv())!.examen!.aufklaerung).toBeUndefined();
    await temps((CIBLE - AUFK) * 1000, 'anamnese');
    await temps(AUFK * 1000, 'transition');
    await waitFor(async () => expect((await aktiv())?.teileGespielt).toEqual(['anamnese']));
    expect((await aktiv())!.sekundenProTeil.anamnese).toBe(CIBLE);
  });
});

describe('Tâche « examen à blanc » du plan', () => {
  it('`/examen?task=` joue le cas de la tâche', async () => {
    const t = { id: 'tache-1', date: '2026-10-06', kind: 'examen-blanc', label: VOLLE[2].name, caseId: VOLLE[2].id, teile: TEILE, estMin: 60, creeA: T0 } as unknown as TaskInstance;
    await db.day_plans.put({ date: '2026-10-06', materializedAt: T0, mode: 'examen-blanc', seed: 's', targetMin: 60, tasks: [t] } as DayPlan);
    rendre('/examen?task=tache-1');
    await demarre();
    const l = (await aktiv())!;
    expect([l.caseId, l.taskId]).toEqual([VOLLE[2].id, 'tache-1']);
  });
});
