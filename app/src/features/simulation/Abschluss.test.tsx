import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { checklistFor } from '@/lib/checklists';
import { erstelleLauf, transition } from '@/lib/lauf/automat';
import type { Lauf } from '@/lib/lauf/types';
import type { SimTeil } from '@/db/types';
import { Ende, SimulationBeendenKnopf, istEnde } from './Abschluss';

// Re-revue 2, item 2 : le CÂBLAGE de la vue de fin — en-tête, « ← Revenir au
// bilan », Arztbrief facultatif, alerte d'échec — est testé au rendu.
const r = { done: true, durationSec: 60, checklist: [], feeling: 50, contentPct: 50, officialPct: 50 };

function lauf(teile: SimTeil[], gespielt: number, bis: 'laufend' | 'bilanz' | 'checkliste' | 'arztbrief'): Lauf {
  let l = erstelleLauf({ caseId: 'c1', profileId: 'p1', geplanteTeile: teile, assistance: 'assiste', layer: 1 });
  l = transition(l, { typ: 'demarrer', checkliste: teile.flatMap((t) => checklistFor(t)) });
  for (let i = 0; i < gespielt; i++) {
    l = transition(l, { typ: 'terminerPartie', ergebnis: r });
    if (i < gespielt - 1 || bis === 'laufend') l = transition(l, { typ: 'partieSuivante' });
  }
  if (bis === 'checkliste' || bis === 'arztbrief') l = transition(l, { typ: 'versChecklist' });
  if (bis === 'arztbrief') l = transition(l, { typ: 'arztbriefSchreiben' });
  return l;
}

const cb = () => ({ onZurueck: vi.fn(), onArztbrief: vi.fn(), onSpeichern: vi.fn() });

// [S4] simulation-run.md §10.2.3 : la sortie de fin du bilan s'appelle « Terminer ici » (INV-71).
describe('en-tête — « Terminer ici → »', () => {
  it('absent pendant une partie en cours, même avec une partie jouée', () => {
    render(<SimulationBeendenKnopf lauf={lauf(['anamnese', 'dokumentation', 'fallvorstellung'], 1, 'laufend')} onClick={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Terminer ici/ })).toBeNull();
  });
  it('présent au bilan, et branché', () => {
    const onClick = vi.fn();
    render(<SimulationBeendenKnopf lauf={lauf(['anamnese'], 1, 'bilanz')} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Terminer ici/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('écran de fin — checkliste', () => {
  it('« ← Revenir au bilan », Arztbrief et Enregistrer sont branchés', () => {
    const f = cb();
    render(<Ende lauf={lauf(['anamnese'], 1, 'checkliste')} fehler={null} brief={null} {...f} />);
    fireEvent.click(screen.getByRole('button', { name: /Revenir au bilan/ }));
    fireEvent.click(screen.getByRole('button', { name: /Rédiger l'Arztbrief/ }));
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer la simulation/ }));
    expect(f.onZurueck).toHaveBeenCalledOnce();
    expect(f.onArztbrief).toHaveBeenCalledOnce();
    expect(f.onSpeichern).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('Dokumentation jouée : l’Arztbrief n’est pas proposé', () => {
    render(<Ende lauf={lauf(['dokumentation'], 1, 'checkliste')} fehler={null} brief={null} {...cb()} />);
    expect(screen.queryByRole('button', { name: /Arztbrief/ })).toBeNull();
  });
  it('échec d’enregistrement : l’alerte est rendue, avec le message humain', () => {
    render(<Ende lauf={lauf(['anamnese'], 1, 'checkliste')} fehler="L'enregistrement a échoué." brief={null} {...cb()} />);
    expect(screen.getByRole('alert').textContent).toContain("L'enregistrement a échoué.");
  });
});

describe('écran de fin — arztbrief', () => {
  it('rend la rédaction, l’alerte et « Enregistrer »', () => {
    const f = cb();
    render(<Ende lauf={lauf(['anamnese'], 1, 'arztbrief')} fehler="Échec." brief={<div>REDACTION</div>} {...f} />);
    expect(screen.getByText('REDACTION')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer la simulation/ }));
    expect(f.onSpeichern).toHaveBeenCalledOnce();
  });
});

describe('istEnde — quand le runner rend l’écran de fin', () => {
  it('checkliste et arztbrief oui ; bilan et partie en cours non', () => {
    expect(istEnde(lauf(['anamnese'], 1, 'checkliste'))).toBe(true);
    expect(istEnde(lauf(['anamnese'], 1, 'arztbrief'))).toBe(true);
    expect(istEnde(lauf(['anamnese'], 1, 'bilanz'))).toBe(false);
    expect(istEnde(lauf(['anamnese', 'dokumentation', 'fallvorstellung'], 1, 'laufend'))).toBe(false);
  });
});
