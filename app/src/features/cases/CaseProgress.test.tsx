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
  await db.cases.bulkPut([kase('c1'), kase('c2', { status: 'À faire', confidence: 0 })]);
  const cp: CaseProgress = { caseId: 'c1', overall: 'entame', teile: { anamnese: teil('solide', 90), dokumentation: teil('acquis', 70), fallvorstellung: teil('vierge', null) } };
  await db.case_progress.put(cp);
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
    expect(card.textContent).toMatch(/Entamé/);
    const blank = [...container.querySelectorAll('h3')].find((h) => h.textContent === 'Cas c2')!.closest('.card')!;
    expect(blank.textContent).toMatch(/Pas encore travaillé/);
  });
});
