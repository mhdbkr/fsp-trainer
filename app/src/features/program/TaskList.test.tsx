// C6-B point 4 — l'accueil : le titre ENTIER d'abord, le « pourquoi » ensuite ;
// un « pourquoi » partagé par plusieurs lignes se dit UNE fois.
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { TaskInstance } from '@/db/types';
import { TaskLine, TaskList, raisonCommune } from './TaskLine';

afterEach(cleanup);
const JAMAIS = 'Jamais rencontré, et il reste du temps pour le découvrir posément.';
const t = (i: number, over: Partial<TaskInstance> = {}): TaskInstance => ({
  id: `t${i}`, date: '2026-10-05', kind: 'simulation', caseId: `c${i}`, label: `Cas numéro ${i} avec un titre très long`,
  estMin: 20, source: 'plan', reason: JAMAIS, ...over,
});
const dans = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('le titre d\'une tâche n\'est jamais coupé', () => {
  it('le titre complet est dans le DOM et ne porte pas `truncate`', () => {
    dans(<TaskLine task={t(1, { label: 'Obere GI-Blutung bei Ulcus ventriculi' })} />);
    const titre = screen.getByText('Obere GI-Blutung bei Ulcus ventriculi');
    expect(titre.className).not.toMatch(/truncate/);
    expect(titre.closest('.truncate')).toBeNull();
  });
  it('le « pourquoi » non plus', () => {
    dans(<TaskLine task={t(1)} />);
    expect(screen.getByText(JAMAIS).className).not.toMatch(/truncate/);
  });
});

describe('raisonCommune — la raison que ≥ 3 lignes partagent', () => {
  it('la rend avec son nombre ; rien en dessous de 3, rien pour les tâches faites', () => {
    expect(raisonCommune([t(1), t(2), t(3), t(4, { reason: 'Autre.' })])).toEqual({ reason: JAMAIS, n: 3 });
    expect(raisonCommune([t(1), t(2), t(3, { reason: 'Autre.' })])).toBeNull();
    expect(raisonCommune([t(1), t(2), t(3, { doneAt: 1 })])).toBeNull();
  });
});

describe('TaskList', () => {
  it('5 lignes, une seule raison : elle est dite une fois, les lignes ne la répètent pas', () => {
    dans(<TaskList tasks={[1, 2, 3, 4, 5].map((i) => t(i))} />);
    expect(document.body.textContent!.split(JAMAIS).length - 1).toBe(1);
    expect(screen.getByText(/même raison pour les 5 cas/i)).toBeTruthy();
    for (let i = 1; i <= 5; i++) expect(screen.getByText(`Cas numéro ${i} avec un titre très long`)).toBeTruthy();
  });
  it('raisons toutes différentes : chaque ligne garde la sienne, aucun en-tête', () => {
    dans(<TaskList tasks={[1, 2, 3].map((i) => t(i, { reason: `Raison ${i}.` }))} />);
    for (let i = 1; i <= 3; i++) expect(screen.getAllByText(`Raison ${i}.`)).toHaveLength(1);
    expect(screen.queryByText(/même raison/i)).toBeNull();
  });
});
