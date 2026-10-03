// B-C3 (revue s3-programme) : le travail hors plan est journalisé — une fiche
// lue jusqu'au bout, une Aufklärung travaillée. Rendu des VRAIES pages, clic
// dans le DOM, lecture de ce que l'app a écrit.
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
import type { AufklaerungItem, Fachwissen, TaskInstance } from '@/db/types';
import { freezeAt, resetClock } from '@/lib/clock';
import { FachwissenDetailPage } from '@/features/fachwissen/FachwissenDetailPage';
import { AufklaerungPage } from '@/features/aufklaerung/AufklaerungPage';

const fw = {
  id: 'fw-x', pathology: 'Pankreatitis', specialty: 'Gastroenterologie', definition: 'd',
  klinik: [{ text: 'k' }], diagnostik: [{ stufe: 'Labor', text: 'Lipase' }], differenzialdiagnosen: [], therapie: [],
  pruefungsfallen: [], askedInExam: [], linkedCaseIds: ['c1', 'c2'], linkedAufklaerungIds: [], keyFachbegriffeIds: [],
} as unknown as Fachwissen;
const aufk = {
  id: 'a1', name: 'Koloskopie', category: 'Untersuchung', linkedCaseIds: [], patientQuestions: [],
  blocks: { einleitung: '', metakommunikation: '', warum: '', ablauf: '', vorbereitung: '', abschluss: '', standardRisiken: [], spezifischeRisiken: [] },
} as unknown as AufklaerungItem;

window.matchMedia ??= (() => ({ matches: false })) as unknown as typeof window.matchMedia;   // jsdom
Element.prototype.scrollIntoView ??= function () {};                                            // jsdom
let container: HTMLDivElement; let root: Root;
async function render(path: string, route: string, el: JSX.Element) {
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => { root.render(<MemoryRouter initialEntries={[path]}><Routes><Route path={route} element={el} /></Routes></MemoryRouter>); });
}
const button = (text: RegExp) => [...container.querySelectorAll('button')].find((b) => text.test(b.textContent ?? ''));
/** Clique, puis attend la confirmation — posée APRÈS l'écriture du journal. */
async function click(text: RegExp) {
  await vi.waitFor(() => expect(button(text)).toBeDefined(), { timeout: 5000 });
  await act(async () => { button(text)!.click(); });
  await vi.waitFor(() => expect(container.textContent).toMatch(/noté dans ton historique/i), { timeout: 5000 });
}

beforeEach(async () => {
  await Promise.all([db.training_events.clear(), db.day_plans.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear(), db.fachwissen.clear(), db.aufklaerungen.clear()]);
  await db.fachwissen.put(fw); await db.aufklaerungen.put(aufk);
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); });

describe('B-C3 — fiche et Aufklärung écrivent leur événement', () => {
  it('fiche lue jusqu\'au bout : UN training.logged `fiche`, temps mesuré, et la tâche Fachwissen du cas est cochée', async () => {
    const advance = freezeAt(new Date(2026, 9, 1, 10, 0));
    const t: TaskInstance = { id: 'tf', date: '2026-10-01', kind: 'fachwissen', caseId: 'c2', label: 'Pankreatitis', estMin: 15, source: 'plan', reason: 'r' };
    await db.day_plans.put({ date: '2026-10-01', materializedAt: 0, mode: 'teil-first', seed: 's', targetMin: 90, tasks: [t] });
    await render('/fachwissen/fw-x?case=c2', '/fachwissen/:id', <FachwissenDetailPage />);
    await vi.waitFor(() => expect(button(/fiche lue/i)).toBeDefined(), { timeout: 5000 });   // monté : le chronomètre part
    advance(7 * 60_000);
    await click(/fiche lue/i);
    const [te] = await db.training_events.toArray();
    expect([te.kind, te.caseId, te.spentMin, te.taskId]).toEqual(['fiche', 'c2', 7, 'tf']);
    expect(await db.progress_events.where('type').equals('training.logged').count()).toBe(1);
    expect(container.textContent).toMatch(/noté/i);
    expect(button(/fiche lue/i)).toBeUndefined();                   // pas de second événement par un second clic
  });

  it('Aufklärung travaillée : UN training.logged `aufklaerung`, temps mesuré depuis l\'ouverture', async () => {
    const advance = freezeAt(new Date(2026, 9, 1, 10, 0));
    await render('/aufklaerung?open=a1', '/aufklaerung', <AufklaerungPage />);
    await vi.waitFor(() => expect(button(/aufklärung travaillée/i)).toBeDefined(), { timeout: 5000 });
    advance(4 * 60_000);
    await click(/aufklärung travaillée/i);
    const [te] = await db.training_events.toArray();
    expect([te.kind, te.spentMin, te.caseId]).toEqual(['aufklaerung', 4, undefined]);
  });
});
