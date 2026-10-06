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

// Le premier rendu charge motion et jsdom à froid : sous charge machine il dépassait 5 s (mesuré, 10 s à load 28).
vi.setConfig({ testTimeout: 30_000 });
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
// Le cadran lit le réglage par `useReducedMotion` de lib/motion (motion ne l'écoute qu'une fois par module : on le pilote ici).
const mouvement = vi.hoisted(() => ({ reduit: false }));
vi.mock('@/lib/motion', async (orig) => ({ ...(await orig<typeof import('@/lib/motion')>()), useReducedMotion: () => mouvement.reduit }));
const reduit = (v: boolean) => { mouvement.reduit = v; };

beforeEach(() => { freezeAt(AUJOURDHUI); reduit(false); oublieLesTraces(); });
afterEach(() => { cleanup(); resetClock(); vi.useRealTimers(); vi.unstubAllGlobals(); reduit(false); });

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

  it('« à confirmer » se distingue d\'un simple acquis (un liseré pétrole sur le bord), sans changer de couleur', () => {
    const { container } = monte(A_CONFIRMER);
    expect(arc(container, 'anamnese').getAttribute('data-etat')).toBe('a-confirmer');
    expect(container.querySelector('[data-liseret="anamnese"]')).not.toBeNull();
    cleanup();
    const simple = monte(dial({ ...A_CONFIRMER, teile: { ...A_CONFIRMER.teile, anamnese: t('acquis', 85, { solideDes: '2026-10-08' }) } })).container;
    expect(arc(simple, 'anamnese').getAttribute('data-etat')).toBe('acquis');
    expect(simple.querySelector('[data-liseret]')).toBeNull();
  });

  it('faite — non mesurée : un trait en pointillé, ni vierge ni acquis', () => {
    const { container } = monte(NON_MESURE);
    expect(arc(container, 'anamnese').getAttribute('data-etat')).toBe('non-mesure');
    // pathLength = 1 : un tiret doit mesurer une fraction du tracé, sinon le trait reste plein.
    const tiret = Number((arc(container, 'anamnese').getAttribute('stroke-dasharray') ?? '').split(' ')[0]);
    expect(tiret).toBeGreaterThan(0);
    expect(tiret).toBeLessThan(0.2);
  });

  it('cinq tailles, une primitive ; le chiffre central disparaît quand il ne se lirait plus', () => {
    const tailles: CaseDialSize[] = [24, 36, 64, 96, 160];
    for (const s of tailles) {
      const { container } = monte(ENTAME, { size: s });
      expect(container.querySelector('svg')?.getAttribute('width')).toBe(String(s));
      expect(!!container.querySelector('[data-centre]')).toBe(s >= 64);
      cleanup();
    }
  });
});

describe('couleurs — des variables, pas du dur', () => {
  it('C1 : la palette est LUE dans tailwind.config (theme()), aucun hex copié ; le composant ne code aucune couleur', () => {
    const css = readFileSync(join(__dirname, '..', '..', 'styles', 'index.css'), 'utf-8');
    const bloc = css.slice(css.indexOf('Le cadran d\'un cas'));
    expect(bloc).toMatch(/--cd-acquis: theme\('colors\.brand\.400'\)/);      // brand-400 = #379e8f : 2,98:1 sur le papier (décision de main)
    expect(bloc).toMatch(/--cd-discret: theme\('colors\.slate\.500'\)/);
    expect(bloc).toMatch(/--cd-encre: theme\('colors\.ink\.DEFAULT'\)/);
    expect(bloc).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(readFileSync(join(__dirname, 'CaseDial.tsx'), 'utf-8')).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });
  it('C1 : pas de gris propre au détail — un seul gris, --cd-discret', () => {
    const src = readFileSync(join(__dirname, 'CaseDial.tsx'), 'utf-8');
    expect(src).not.toMatch(/text-slate-|dark:text-/);
    expect(src).toMatch(/rounded-card/);
    expect(src).not.toMatch(/rounded-xl/);
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
  it('clavier : le clic (Entrée, Espace, lecteur d’écran → detail 0) ouvre, Échap ferme et rend le focus au cadran', () => {
    monte(ENTAME);
    const b = screen.getByRole('button');
    b.focus();
    fireEvent.click(b);
    expect(b.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document.activeElement ?? b, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(b);
  });

  it('I2 — un clic de SOURIS ou de doigt (detail 1) n\'ouvre rien : seul le clic clavier / lecteur d\'écran (detail 0)', () => {
    monte(ENTAME);
    fireEvent.click(screen.getByRole('button'), { detail: 1 });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button'), { detail: 0 });
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button'), { detail: 0 });          // bascule : referme
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false');
  });

  it('I2 — Entrée/Espace ne passent plus par keydown (sinon Espace ouvrirait puis refermerait au keyup)', () => {
    monte(ENTAME);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Tab depuis le cadran vers un autre élément referme le détail (il ne reste pas flottant)', () => {
    monte(ENTAME);
    const b = screen.getByRole('button');
    fireEvent.click(b);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.blur(b, { relatedTarget: document.body });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('m5 — Tab depuis le détail referme et rend le focus au cadran', () => {
    monte(ENTAME);
    const b = screen.getByRole('button');
    fireEvent.click(b);
    const detail = screen.getByRole('dialog');
    (detail.querySelector('a') as HTMLElement).focus();
    fireEvent.keyDown(detail.querySelector('a') as HTMLElement, { key: 'Tab' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(b);
  });

  it('clavier : Espace ouvre aussi (même chemin : un clic synthétique)', () => {
    monte(ENTAME);
    const b = screen.getByRole('button');
    fireEvent.click(b);
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

  it('un appui ailleurs referme le détail (tactile : pas de survol pour le fermer)', () => {
    monte(ENTAME);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    pointer(document.body, 'pointerdown', 'touch');
    expect(screen.queryByRole('dialog')).toBeNull();
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
    fireEvent.click(screen.getByRole('button'));
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

  it('R1 : la date de solidité, et ce qui manque pour être prêt', () => {
    const d = dial({ ...SOLIDE, teile: { ...SOLIDE.teile, anamnese: t('acquis', 85, { solideDes: '2026-10-08' }) }, pretManque: ['autonome'] });
    const detail = ouvre(d);
    expect(detail.textContent).toMatch(/Solide si tu refais 80 ou plus à partir du jeudi 8 oct\./);
    expect(detail.textContent).toMatch(/Pour être prêt : rejoue-le en Autonome\./);
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
    fireEvent.click(screen.getByRole('button'));
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
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog').getAttribute('data-panneau')).toBe('true');
  });

  it('pas de pulsation de soudure', () => {
    const { container } = monte(PRET, { vientDeSouder: true });
    expect(container.querySelector('.cd-soude-trace')).toBeNull();
  });

  it('le CSS ne grandit ni n\'écarte les arcs hors de `prefers-reduced-motion: no-preference`', () => {
    const css = readFileSync(join(__dirname, '..', '..', 'styles', 'index.css'), 'utf-8');
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


describe('D1 — l\'ouverture est visible : le cadran grandit, les arcs s\'écartent, le panneau naît du cadran', () => {
  const ouvert = (d: CaseDialData, size: CaseDialSize = 64) => {
    const r = monte(d, { size });
    fireEvent.click(screen.getByRole('button'));
    return r;
  };
  const px = (e: Element | null) => Number((e?.getAttribute('font-size') ?? '0'));

  it('la carte (64) grandit jusqu\'à ~96 px : le facteur est publié pour le CSS', () => {
    const { container } = monte(ENTAME, { size: 64 });
    const echelle = Number((container.querySelector('.case-dial') as HTMLElement).style.getPropertyValue('--cd-echelle'));
    expect(64 * echelle).toBeCloseTo(96, 5);
    cleanup();
    const ligne = Number((monte(ENTAME, { size: 36 }).container.querySelector('.case-dial') as HTMLElement).style.getPropertyValue('--cd-echelle'));
    expect(36 * ligne).toBeCloseTo(96, 5);
  });

  it('près du bord de l\'écran, le cadran ouvert se décale pour rester entier', () => {
    vi.stubGlobal('innerWidth', 390);
    const { container } = monte(ENTAME, { size: 64 });
    const b = container.querySelector('.case-dial') as HTMLElement;
    b.getBoundingClientRect = () => ({ left: 300, top: 100, width: 64, height: 64, right: 364, bottom: 164, x: 300, y: 100, toJSON() {} }) as DOMRect;
    fireEvent.click(b);
    const ox = parseFloat(b.style.getPropertyValue('--cd-ox'));
    expect(ox).toBeLessThan(0);
    expect(332 + ox + (96 / 120) * 80).toBeLessThanOrEqual(390 - 5.9);        // centre + décalage + rayon ouvert tient dans l'écran
    fireEvent.click(b);
    b.getBoundingClientRect = () => ({ left: 100, top: 100, width: 64, height: 64, right: 164, bottom: 164, x: 100, y: 100, toJSON() {} }) as DOMRect;
    fireEvent.click(b);
    expect(parseFloat(b.style.getPropertyValue('--cd-ox'))).toBe(0);          // au milieu de l\'écran : aucun décalage
  });

  it('les arcs s\'écartent d\'environ 9 unités, vers l\'extérieur', () => {
    const { container } = monte(ENTAME);
    for (const g of container.querySelectorAll('.cd-groupe')) {
      const dx = parseFloat((g as SVGElement).style.getPropertyValue('--dx'));
      const dy = parseFloat((g as SVGElement).style.getPropertyValue('--dy'));
      expect(Math.hypot(dx, dy)).toBeCloseTo(9, 1);
    }
  });

  it('les repères Teil + score existent sur la carte, en police rendue ≥ 11 px une fois ouvert (C2)', () => {
    const { container } = monte(ENTAME, { size: 64 });
    const reperes = [...container.querySelectorAll('[data-repere]')];
    expect(reperes.map((r) => r.textContent)).toEqual(['A 78', 'D', 'F 54']);
    const echelle = Number((container.querySelector('.case-dial') as HTMLElement).style.getPropertyValue('--cd-echelle'));
    for (const r of reperes) expect(px(r) * (64 * echelle) / 120).toBeGreaterThanOrEqual(10.99);
    cleanup();
    const grand = monte(ENTAME, { size: 160 }).container;       // 160 : grossit à peine, la police suit
    const e160 = Number((grand.querySelector('.case-dial') as HTMLElement).style.getPropertyValue('--cd-echelle'));
    for (const r of grand.querySelectorAll('[data-repere]')) expect(px(r) * (160 * e160) / 120).toBeGreaterThanOrEqual(10.99);
  });

  it('C2 : le texte du centre se lit (≥ 11 px rendus) à chaque taille où il existe', () => {
    for (const s of [64, 96, 160] as CaseDialSize[]) {
      const { container } = monte(ENTAME, { size: s });
      expect(px(container.querySelector('[data-centre]')) * s / 120).toBeGreaterThanOrEqual(11);
      const sub = container.querySelector('.cd-sub');
      if (sub) expect(px(sub) * s / 120).toBeGreaterThanOrEqual(11);
      cleanup();
    }
  });

  it('le panneau NAÎT du cadran : même origine de transformation, centre du cadran', () => {
    ouvert(ENTAME);
    const d = screen.getByRole('dialog') as HTMLElement;
    expect(d.style.transformOrigin).toMatch(/^-?[\d.]+px -?[\d.]+px$/);
  });

  it('les lignes du détail arrivent l\'une après l\'autre (--i croissant)', () => {
    ouvert(ENTAME);
    const idx = [...screen.getByRole('dialog').querySelectorAll('.cd-ligne')].map((e) => Number((e as HTMLElement).style.getPropertyValue('--i')));
    expect(idx.length).toBeGreaterThanOrEqual(5);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(new Set(idx).size).toBe(idx.length);
  });

  it('sous mouvement réduit : rien ne grandit (échelle 1), pas de repères sur la carte, panneau immobile', () => {
    reduit(true);
    const { container } = monte(ENTAME, { size: 64 });
    expect((container.querySelector('.case-dial') as HTMLElement).style.getPropertyValue('--cd-echelle')).toBe('1');
    expect(container.querySelector('[data-repere]')).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog').getAttribute('data-panneau')).toBe('true');
  });

  it('CSS : grossir, écarter, épaissir, repères = sous no-preference ; le panneau et ses lignes aussi', () => {
    const css = readFileSync(join(__dirname, '..', '..', 'styles', 'index.css'), 'utf-8');
    const m = css.match(/@media \(prefers-reduced-motion: no-preference\)\s*\{([\s\S]*?)\n\}/g)!.find((b) => b.includes('.case-dial[data-ouvert] svg'))!;
    expect(m).toMatch(/scale\(var\(--cd-echelle/);
    expect(m).toMatch(/translate\(var\(--dx\), var\(--dy\)\)/);
    expect(m).toMatch(/stroke-width: 9/);
    expect(m).toMatch(/\.case-dial-detail \.cd-ligne \{[^}]*animation-delay: calc\([^}]*var\(--i/);
    expect(m).toMatch(/\.cd-label \{ transition: opacity[^;]*var\(--ease-out\)/);
  });
});

describe('D5 — pas de couleur « finie » avec moins de trois Teile joués', () => {
  it('« 100 sur 1 Teil » : chiffre et anneau intérieur en ton discret', () => {
    const un = dial({ teile: { anamnese: t('solide', 100), dokumentation: t('vierge'), fallvorstellung: t('vierge') }, couverture: 1, maitrise: 100 });
    const { container } = monte(un);
    expect(container.querySelector('[data-centre]')?.getAttribute('data-complet')).toBeNull();
    expect(container.querySelector('[data-maitrise]')?.getAttribute('stroke')).toBe('var(--cd-discret)');
  });
  it('trois Teile joués : couleur pleine', () => {
    const { container } = monte(COUVERT);
    expect(container.querySelector('[data-centre]')?.getAttribute('data-complet')).toBe('true');
    expect(container.querySelector('[data-maitrise]')?.getAttribute('stroke')).toBe('var(--cd-maitrise)');
  });
});

// S4-3 fixeur I1 (exception de périmètre accordée par main) : en pré-simulation, le détail est déjà ouvert
// À CÔTÉ du cadran ; le cadran ne s'ouvre pas une seconde fois au survol.
describe('ouvrable={false} — un cadran qui ne s’ouvre pas', () => {
  afterEach(() => { vi.useRealTimers(); cleanup(); });
  it('ni survol, ni appui long, ni clavier : aucun détail flottant ; l’étiquette reste lue', () => {
    vi.useFakeTimers();
    const { container } = monte(ENTAME, { ouvrable: false });
    const el = container.querySelector('.case-dial')!;
    expect(el.getAttribute('aria-label')).toBe(etiquette(ENTAME, 'Leberzirrhose'));
    expect(el.tagName).not.toBe('BUTTON');
    pointer(el, 'pointerenter', 'mouse');
    act(() => { vi.advanceTimersByTime(1000); });
    pointer(el, 'pointerdown', 'touch');
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.click(el, { detail: 0 });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelectorAll('.case-dial-detail')).toHaveLength(0);
  });
});
