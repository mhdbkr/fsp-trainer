// B-C5 (revue s3-programme) : les pages Cas lisent `case_progress`, jamais
// `Case.status` / `Case.confidence` (dépréciés, encore écrits par saveSimulation
// jusqu'à R-C5-écriture). Scénario de la revue : Anamnese 90 → « Maîtrisé »
// après un seul Teil, puis Dokumentation 70 → « En cours ».
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { Case, CaseProgress } from '@/db/types';
import { CasesPage } from './CasesPage';

const kase = (id: string, over: Partial<Case> = {}) => ({
  id, name: `Cas ${id}`, pathology: 'p', specialty: 'Kardiologie', frequency: 10, difficulty: 2, centers: [],
  status: 'Maîtrisé', confidence: 90, linkedFachbegriffeIds: [], ...over,
} as unknown as Case);
const teil = (status: 'vierge' | 'fragile' | 'acquis' | 'solide', lastScore: number | null) => ({ status, lastScore, lastAt: lastScore === null ? null : 1, attempts: lastScore === null ? 0 : 1 });

let container: HTMLDivElement; let root: Root;
beforeEach(async () => {
  await Promise.all([db.cases.clear(), db.case_progress.clear()]);
  await db.cases.bulkPut([kase('c1'), kase('c2', { status: 'À faire', confidence: 0 }), kase('c3')]);
  const cp: CaseProgress = { caseId: 'c1', overall: 'entame', teile: { anamnese: teil('solide', 90), dokumentation: teil('acquis', 70), fallvorstellung: teil('vierge', null) } };
  await db.case_progress.put(cp);
  // I-4 : une tâche cochée sans jeu — faite, non mesurée.
  await db.case_progress.put({ caseId: 'c3', overall: 'vierge', teile: { anamnese: { ...teil('vierge', null), nonMesureAt: 1 }, dokumentation: teil('vierge', null), fallvorstellung: teil('vierge', null) } });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => { root.render(<MemoryRouter initialEntries={['/cas']}><Routes><Route path="/cas" element={<CasesPage />} /></Routes></MemoryRouter>); });
  await vi.waitFor(() => expect(container.textContent).toMatch(/Cas c2/), { timeout: 3000 });
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('B-C5 — la page Cas lit case_progress', () => {
  it('aucun statut déprécié affiché ; l\'état vient de la progression par Teil', () => {
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/Maîtrisé|En cours|À faire/);
    const card = [...container.querySelectorAll('h3')].find((h) => h.textContent === 'Cas c1')!.closest('.card')!;
    // D2 : le cadran dit l'état ; plus de pastille « Entamé » qui le doublonne ou le contredit.
    expect(card.textContent).not.toMatch(/Entamé|Solide|Pas encore travaillé/);
    expect(card.querySelector('button.case-dial')?.getAttribute('aria-label')).toMatch(/Anamnese : solide, 90/);
    const blank = [...container.querySelectorAll('h3')].find((h) => h.textContent === 'Cas c2')!.closest('.card')!;
    expect(blank.querySelector('button.case-dial')?.getAttribute('aria-label')).toMatch(/Pas encore travaillé/);
  });
});

describe('I-4 — la page Cas dit « faite — non mesurée »', () => {
  it('un cas coché sans jeu n\'est ni « pas encore travaillé » ni « entamé »', async () => {
    await vi.waitFor(() => expect(container.textContent).toMatch(/Cas c3/), { timeout: 3000 });
    const card = [...container.querySelectorAll('h3')].find((h) => h.textContent === 'Cas c3')!.closest('.card')!;
    const label = card.querySelector('button.case-dial')?.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/^Cas c3 : Fait — non mesuré\./);          // « un cas » : masculin
    expect(label).not.toMatch(/^Cas c3 : Pas encore travaillé/);
    expect(container.textContent).toMatch(/1\s*fait — non mesuré/i);
  });
});

describe('S4-4 — le cadran est le signe du cas sur la carte', () => {
  const carte = (nom: string) => [...container.querySelectorAll('h3')].find((h) => h.textContent === nom)!.closest('.card')!;

  it('une carte = un cadran, étiqueté Teil par Teil ; plus de pastilles en doublon', () => {
    const c1 = carte('Cas c1');
    const dial = c1.querySelector('button.case-dial') as HTMLButtonElement;
    expect(dial).not.toBeNull();
    expect(dial.getAttribute('data-size')).toBe('64');
    const label = dial.getAttribute('aria-label') ?? '';
    expect(label).toContain('Cas c1');
    expect(label).toMatch(/Anamnese : solide, 90/);
    expect(label).toMatch(/Dokumentation : acquis, 70/);
    expect(label).toMatch(/Fallvorstellung : pas encore travaillé/);
    expect(c1.querySelector('[role="img"][aria-label^="Anamnese"]')).toBeNull();   // les pastilles TeilDots ne doublonnent plus
  });

  it('un cas jamais ouvert : trois arcs neutres, aucun chiffre', () => {
    const c2 = carte('Cas c2');
    expect([...c2.querySelectorAll('[data-arc]')].map((a) => a.getAttribute('data-etat'))).toEqual(['vierge', 'vierge', 'vierge']);
    expect(c2.querySelector('[data-centre]')?.textContent).toBe('—');
  });

  it('« faite — non mesurée » se lit sur le cadran', () => {
    expect(carte('Cas c3').querySelector('[data-arc="anamnese"]')?.getAttribute('data-etat')).toBe('non-mesure');
  });
});

describe('S4-4 (revue direction) — un seul bouton principal, la suite que propose le cadran', () => {
  const carte = (nom: string) => [...container.querySelectorAll('h3')].find((h) => h.textContent === nom)!.closest('.card')!;

  it('D3 : « Simuler » devient la suite du cadran, avec son ?teil=', () => {
    const c1 = carte('Cas c1');
    const principal = c1.querySelector('a.btn-primary') as HTMLAnchorElement;
    expect(principal.textContent).toBe('Reprendre par la Fallvorstellung');
    expect(principal.getAttribute('href')).toBe('/simulation/c1/pre?teil=fallvorstellung');
    expect(c1.querySelectorAll('.btn-primary')).toHaveLength(1);
    expect(carte('Cas c2').querySelector('a.btn-primary')?.textContent).toBe('Commencer le cas');
    expect(container.textContent).not.toMatch(/Simuler/);
  });

  it('D3 : le détail ouvert sur la carte n\'ajoute pas un second gros bouton', async () => {
    const c1 = carte('Cas c1');
    await act(async () => { (c1.querySelector('button.case-dial') as HTMLButtonElement).click(); });
    // un clic synthétique a detail 0 : c\'est le chemin clavier / lecteur d\'écran
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull(), { timeout: 2000 });
    expect(document.querySelector('[role="dialog"] a')).toBeNull();
  });

  it('polish : la difficulté est nommée et loin du cadran', () => {
    const c1 = carte('Cas c1');
    expect(c1.textContent).toMatch(/Difficulté/);
    const dots = c1.querySelector('[title^="Difficulté"]')!;
    expect(c1.querySelector('button.case-dial')!.parentElement!.contains(dots)).toBe(false);
  });
});
