// Le cadran (S4-4) : rendu de chaque état depuis `CaseDialData`, étiquette
// accessible, ouverture (souris 300 ms, tactile 450 ms, clavier), mouvement
// réduit, INV-59 (le composant reçoit la donnée, il ne calcule rien).
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { freezeAt, resetClock } from '@/lib/clock';
import type { CaseDialData } from '@/lib/dialData';
import { CaseDial, oublieLesTraces, type CaseDialSize } from './CaseDial';
import { etiquette } from './CaseDialText';

const AUJOURDHUI = new Date(2026, 9, 5, 12).getTime();        // lundi 5 oct. 2026
type T = CaseDialData['teile']['anamnese'];
const t = (status: T['status'], lastScore: number | null = null, over: Partial<T> = {}): T =>
  ({ status, lastScore, lastAt: lastScore === null ? null : AUJOURDHUI - 3 * 86_400_000, nonMesure: false, solideDes: null, ...over });
const dial = (over: Partial<CaseDialData> = {}): CaseDialData => ({
  caseId: 'c1', teile: { anamnese: t('vierge'), dokumentation: t('vierge'), fallvorstellung: t('vierge') },
  couverture: 0, maitrise: null, soude: false, pretAt: null, pretManque: [], prochaineConsolidation: null, ...over,
});
const S = t('solide', 88);
const VIERGE = dial();
const ENTAME = dial({ teile: { anamnese: t('acquis', 78), dokumentation: t('vierge'), fallvorstellung: t('fragile', 54) }, couverture: 2, maitrise: 66 });
const COUVERT = dial({ teile: { anamnese: t('acquis', 78), dokumentation: t('acquis', 70), fallvorstellung: t('fragile', 54) }, couverture: 3, maitrise: 67 });
const SOLIDE = dial({ teile: { anamnese: S, dokumentation: S, fallvorstellung: S }, couverture: 3, maitrise: 88, pretManque: ['autonome', 'grille'] });
const PRET = dial({ teile: { anamnese: S, dokumentation: S, fallvorstellung: S }, couverture: 3, maitrise: 88, soude: true, pretAt: AUJOURDHUI });
const A_CONFIRMER = dial({ teile: { anamnese: t('acquis', 85, { solideDes: '2026-10-04' }), dokumentation: t('vierge'), fallvorstellung: t('vierge') }, couverture: 1, maitrise: 85 });
const NON_MESURE = dial({ teile: { anamnese: { ...t('vierge'), nonMesure: true }, dokumentation: t('vierge'), fallvorstellung: t('vierge') } });

const monte = (d: CaseDialData, props: Partial<React.ComponentProps<typeof CaseDial>> = {}) =>
  render(<MemoryRouter><CaseDial data={d} nom="Leberzirrhose" size={64} {...props} /></MemoryRouter>);
const arcs = (c: HTMLElement) => [...c.querySelectorAll('[data-arc]')] as SVGElement[];
const arc = (c: HTMLElement, teil: string) => c.querySelector(`[data-arc="${teil}"]`) as SVGElement;

/** jsdom n'a pas (toujours) PointerEvent : un MouseEvent qui porte `pointerType`.
 *  React dérive enter/leave de pointerover/pointerout (relatedTarget absent = on vient de dehors). */
const NATIF: Record<string, string> = { pointerenter: 'pointerover', pointerleave: 'pointerout' };
const pointer = (el: Element, type: string, pointerType: 'mouse' | 'touch') => {
  const e = new MouseEvent(NATIF[type] ?? type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'pointerType', { value: pointerType });
  act(() => { el.dispatchEvent(e); });
};
const reduit = (v: boolean) => vi.stubGlobal('matchMedia', (q: string) => ({
  matches: v && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
}));

beforeEach(() => { freezeAt(AUJOURDHUI); reduit(false); oublieLesTraces(); });
afterEach(() => { cleanup(); resetClock(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('rendu de chaque état, depuis CaseDialData', () => {
  it('vierge : trois arcs NEUTRES (jamais un défaut), aucun chiffre', () => {
    const { container } = monte(VIERGE);
    expect(arcs(container).map((a) => a.getAttribute('data-etat'))).toEqual(['vierge', 'vierge', 'vierge']);
    expect(container.querySelector('[data-maitrise]')).toBeNull();
    expect(container.querySelector('[data-centre]')?.textContent).toBe('—');
    expect(container.textContent).not.toMatch(/\b0\b/);
  });

  it('entamé : la position dit le Teil (A, D, F toujours à leur place), la couleur dit l\'état', () => {
    const { container } = monte(ENTAME);
    expect(arcs(container).map((a) => [a.getAttribute('data-arc'), a.getAttribute('data-etat')])).toEqual([
      ['anamnese', 'acquis'], ['dokumentation', 'vierge'], ['fallvorstellung', 'fragile'],
    ]);
    expect(container.querySelector('[data-centre]')?.textContent).toBe('66');
    expect(container.querySelector('[data-maitrise]')?.getAttribute('data-valeur')).toBe('66');
  });

  it('la position d\'un Teil ne dépend pas de l\'état : mêmes angles pour vierge et pour solide', () => {
    const a = arcs(monte(VIERGE).container).map((x) => x.getAttribute('d'));
    cleanup();
    const b = arcs(monte(COUVERT).container).map((x) => x.getAttribute('d'));
    expect(a).toEqual(b);
  });

  it('couvert : trois arcs séparés, aucun anneau soudé', () => {
    const { container } = monte(COUVERT);
    expect(arcs(container)).toHaveLength(3);
    expect(container.querySelector('[data-soude]')).toBeNull();
    expect(container.querySelector('[data-centre]')?.textContent).toBe('67');
  });

  it('solide : trois arcs solides, encore séparés tant que pretManque n\'est pas vide', () => {
    const { container } = monte(SOLIDE);
    expect(arcs(container).map((a) => a.getAttribute('data-etat'))).toEqual(['solide', 'solide', 'solide']);
    expect(container.querySelector('[data-soude]')).toBeNull();
  });

  it('prêt : les arcs se SOUDENT en un anneau continu', () => {
    const { container } = monte(PRET);
    const anneau = container.querySelector('[data-soude]');
    expect(anneau?.tagName.toLowerCase()).toBe('circle');
    expect(arcs(container)).toHaveLength(0);
    expect(container.querySelector('.case-dial')?.getAttribute('data-pret')).toBe('true');
  });

  it('« à confirmer » se distingue d\'un simple acquis (un fil pétrole), sans changer de couleur', () => {
    const { container } = monte(A_CONFIRMER);
    expect(arc(container, 'anamnese').getAttribute('data-etat')).toBe('a-confirmer');
    expect(container.querySelector('[data-fil="anamnese"]')).not.toBeNull();
    cleanup();
    const simple = monte(dial({ ...A_CONFIRMER, teile: { ...A_CONFIRMER.teile, anamnese: t('acquis', 85, { solideDes: '2026-10-08' }) } })).container;
    expect(arc(simple, 'anamnese').getAttribute('data-etat')).toBe('acquis');
    expect(simple.querySelector('[data-fil]')).toBeNull();
  });

  it('faite — non mesurée : un trait en pointillé, ni vierge ni acquis', () => {
    const { container } = monte(NON_MESURE);
    expect(arc(container, 'anamnese').getAttribute('data-etat')).toBe('non-mesure');
    // pathLength = 1 : un tiret doit mesurer une fraction du tracé, sinon le trait reste plein.
    const tiret = Number((arc(container, 'anamnese').getAttribute('stroke-dasharray') ?? '').split(' ')[0]);
    expect(tiret).toBeGreaterThan(0);
    expect(tiret).toBeLessThan(0.2);
  });

  it('quatre tailles, une primitive ; le chiffre central disparaît quand il ne se lirait plus', () => {
    const tailles: CaseDialSize[] = [36, 64, 96, 160];
    for (const s of tailles) {
      const { container } = monte(ENTAME, { size: s });
      expect(container.querySelector('svg')?.getAttribute('width')).toBe(String(s));
      expect(!!container.querySelector('[data-centre]')).toBe(s >= 64);
      cleanup();
    }
  });
});

describe('étiquette accessible', () => {
  it('le cadran est un bouton dont le nom est l\'étiquette complète ; le SVG est décoratif', () => {
    const { container } = monte(ENTAME);
    const b = screen.getByRole('button', { name: etiquette(ENTAME, 'Leberzirrhose') });
    expect(b.getAttribute('aria-haspopup')).toBe('dialog');
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('ouverture', () => {
  it('clavier : Entrée ouvre, Échap ferme et rend le focus au cadran', () => {
    monte(ENTAME);
    const b = screen.getByRole('button');
    b.focus();
    fireEvent.keyDown(b, { key: 'Enter' });
    expect(b.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document.activeElement ?? b, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(b);
  });

  it('clavier : Espace ouvre aussi', () => {
    monte(ENTAME);
    const b = screen.getByRole('button');
    fireEvent.keyDown(b, { key: ' ' });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('souris : le survol ouvre après 300 ms, jamais au simple passage', () => {
    vi.useFakeTimers();
    monte(ENTAME);
    const b = screen.getByRole('button');
    pointer(b, 'pointerenter', 'mouse');
    act(() => { vi.advanceTimersByTime(299); });
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByRole('dialog')).toBeTruthy();
    pointer(b, 'pointerleave', 'mouse');
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('souris : un passage de 100 ms n\'ouvre rien', () => {
    vi.useFakeTimers();
    monte(ENTAME);
    const b = screen.getByRole('button');
    pointer(b, 'pointerenter', 'mouse');
    act(() => { vi.advanceTimersByTime(100); });
    pointer(b, 'pointerleave', 'mouse');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('tactile : appui long de 450 ms, avec une vibration courte ; un appui bref n\'ouvre rien', () => {
    vi.useFakeTimers();
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    monte(ENTAME);
    const b = screen.getByRole('button');
    pointer(b, 'pointerdown', 'touch');
    act(() => { vi.advanceTimersByTime(449); });
    expect(screen.queryByRole('dialog')).toBeNull();
    pointer(b, 'pointerup', 'touch');
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.queryByRole('dialog')).toBeNull();
    pointer(b, 'pointerdown', 'touch');
    act(() => { vi.advanceTimersByTime(450); });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(vibrate).toHaveBeenCalledWith(expect.any(Number));
    expect(vibrate.mock.calls[0][0]).toBeLessThanOrEqual(20);
  });

  it('le toucher ne déclenche pas le survol', () => {
    vi.useFakeTimers();
    monte(ENTAME);
    pointer(screen.getByRole('button'), 'pointerenter', 'touch');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('le détail', () => {
  const ouvre = (d: CaseDialData, props: Partial<React.ComponentProps<typeof CaseDial>> = {}) => {
    monte(d, props);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    return screen.getByRole('dialog');
  };

  it('chaque Teil avec son état, son score et sa date ; la maîtrise avec sa couverture', () => {
    const detail = ouvre(ENTAME);
    expect(detail.textContent).toContain('66 en moyenne sur 2 Teile');
    expect(detail.textContent).toMatch(/Anamnese/);
    expect(detail.textContent).toMatch(/78/);
    expect(detail.textContent).toMatch(/il y a 3 j/);
    expect(detail.textContent).toMatch(/Dokumentation/);
    expect(detail.textContent).toMatch(/pas encore travaillé/);
    expect(detail.textContent).not.toMatch(/≥|%/);
  });

  it('R1 : la date de solidité, et ce qui manque pour souder', () => {
    const d = dial({ ...SOLIDE, teile: { ...SOLIDE.teile, anamnese: t('acquis', 85, { solideDes: '2026-10-08' }) }, pretManque: ['autonome'] });
    const detail = ouvre(d);
    expect(detail.textContent).toMatch(/Solide si tu refais 80 ou plus à partir du jeudi 8 oct\./);
    expect(detail.textContent).toMatch(/Pour souder l'anneau : rejoue le cas en Autonome\./);
  });

  it('l\'action suivante est un lien vers le cas, sur le bon Teil', () => {
    const detail = ouvre(ENTAME);
    const lien = detail.querySelector('a') as HTMLAnchorElement;
    expect(lien.textContent).toBe('Reprendre par la Dokumentation');
    expect(lien.getAttribute('href')).toBe('/simulation/c1/pre?teil=dokumentation');
  });

  it('un cas entier à rejouer : lien sans Teil ; `action={false}` : aucun lien', () => {
    expect(ouvre(PRET).querySelector('a')?.getAttribute('href')).toBe('/simulation/c1/pre');
    cleanup();
    expect(ouvre(PRET, { action: false }).querySelector('a')).toBeNull();
  });

  it('prochaine reprise, quand le contrat en donne une', () => {
    const detail = ouvre(dial({ ...PRET, prochaineConsolidation: '2026-10-12' }));
    expect(detail.textContent).toMatch(/Prochaine reprise : lundi 12 oct\./);
  });
});

describe('animations — une fois, sans confettis', () => {
  it('l\'arc d\'un Teil joué depuis la dernière visite se dessine ; les autres non', () => {
    const { container } = monte(ENTAME, { data: { ...ENTAME, vientDEtreJoue: ['fallvorstellung'] } });
    expect(arc(container, 'fallvorstellung').classList.contains('cd-trace')).toBe(true);
    expect(arc(container, 'anamnese').classList.contains('cd-trace')).toBe(false);
  });

  it('une seule fois : remonter la carte (filtre, retour) ne redessine rien ; une nouvelle partie, si', () => {
    const joue = { ...ENTAME, vientDEtreJoue: ['fallvorstellung' as const] };
    const a = monte(ENTAME, { data: joue });
    expect(arc(a.container, 'fallvorstellung').classList.contains('cd-trace')).toBe(true);
    a.unmount();
    const b = monte(ENTAME, { data: joue });
    expect(b.container.querySelector('.cd-trace')).toBeNull();
    b.unmount();
    const rejoue = { ...joue, teile: { ...joue.teile, fallvorstellung: { ...joue.teile.fallvorstellung, lastAt: AUJOURDHUI } } };
    expect(arc(monte(ENTAME, { data: rejoue }).container, 'fallvorstellung').classList.contains('cd-trace')).toBe(true);
  });

  it('la classe tient pendant toute la vie du cadran (ouvrir ne coupe pas le tracé)', () => {
    const { container } = monte(ENTAME, { data: { ...ENTAME, vientDEtreJoue: ['fallvorstellung'] } });
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(arc(container, 'fallvorstellung').classList.contains('cd-trace')).toBe(true);
  });

  it('un Teil vierge ne se dessine pas', () => {
    const { container } = monte(VIERGE, { data: { ...VIERGE, vientDEtreJoue: ['anamnese'] } });
    expect(arc(container, 'anamnese').classList.contains('cd-trace')).toBe(false);
  });

  it('le cas qui devient prêt : l\'anneau se soude d\'un trait avec une pulsation', () => {
    const { container } = monte(PRET, { vientDeSouder: true });
    expect(container.querySelector('[data-soude]')?.classList.contains('cd-soude-trace')).toBe(true);
    cleanup();
    expect(monte(PRET).container.querySelector('[data-soude]')?.classList.contains('cd-soude-trace')).toBe(false);
  });
});

describe('mouvement réduit', () => {
  beforeEach(() => reduit(true));

  it('aucune animation, le détail s\'ouvre en panneau immobile', () => {
    const { container } = monte(ENTAME, { data: { ...ENTAME, vientDEtreJoue: ['fallvorstellung'] } });
    expect(container.querySelector('.case-dial')?.getAttribute('data-mouvement')).toBe('reduit');
    expect(container.querySelector('.cd-trace')).toBeNull();
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(screen.getByRole('dialog').getAttribute('data-panneau')).toBe('true');
  });

  it('pas de pulsation de soudure', () => {
    const { container } = monte(PRET, { vientDeSouder: true });
    expect(container.querySelector('.cd-soude-trace')).toBeNull();
  });

  it('le CSS ne grandit ni n\'écarte les arcs hors de `prefers-reduced-motion: no-preference`', () => {
    const css = readFileSync(join(__dirname, '..', 'styles', 'index.css'), 'utf-8');
    const hors = css.replace(/@media \(prefers-reduced-motion: no-preference\)\s*\{[\s\S]*?\n\}/g, '');
    expect(hors).not.toMatch(/\.case-dial\[data-ouvert[^{]*\{[^}]*(transform|translate|scale)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\)\s*\{[\s\S]*?\.case-dial\[data-ouvert/);
  });
});

describe('INV-59 — le cadran lit, il ne calcule pas', () => {
  it('aucun import de la mesure ni de la base dans le composant ni dans ses mots', () => {
    for (const f of ['CaseDial.tsx', 'CaseDialText.ts']) {
      const src = readFileSync(join(__dirname, f), 'utf-8').replace(/^import type .*$/gm, '');   // un type n'est pas une lecture
      expect(src, f).not.toMatch(/from '@\/(db|lib\/journal|lib\/progression|lib\/program)/);
      expect(src, f).not.toMatch(/dexie|useLiveQuery/);
    }
  });

  it('même donnée, même rendu', () => {
    const a = monte(ENTAME).container.innerHTML;
    cleanup();
    expect(monte(ENTAME).container.innerHTML).toBe(a);
  });
});
