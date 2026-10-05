import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { seedCases } from '@/data/seedCases';
import type { BogenNotes, Case } from '@/db/types';
import { MUSTER_BOGEN } from '@/data/guides/musterBogen';
import { AnamneseBogen } from './AnamneseBogen';
import { NotizFeld } from './ImmersiveMode';

// Fixeur S4-3, B1 (revue direction) : le Muster GUIDÉ est raisonné sur le cas, pas recopié du Standard.
//   (a) pas de Frauenanamnese pour un homme — sauf si une note y est déjà (INV-74) ;
//   (b) l'aide de Hauptbeschwerde suit la nature du motif (pas d'« Ausstrahlung » pour une dyspnée) ;
//   (c) Noxen : Rauchen / Alkohol / Drogen.
// I6 : une note prise en mode focus sur un champ à sous-cases écrit dans ses sous-clés — une seule rubrique Noxen.

afterEach(() => cleanup());
const cas = (id: string) => seedCases().find((c) => c.id === id)! as Case;
const bogen = (c: Case, notes: BogenNotes = {}, assistance: 'assiste' | 'autonome' = 'assiste') =>
  render(<AnamneseBogen c={c} muster="guide" notes={notes} onChange={vi.fn()} assistance={assistance} />);
const placeholders = (el: HTMLElement) => [...el.querySelectorAll('textarea, input')].map((x) => x.getAttribute('placeholder') ?? '').join(' | ');

describe('B1 — le Muster guidé raisonné sur le cas', () => {
  it('COPD (homme, dyspnée) : ni Frauenanamnese, ni Ausstrahlung', () => {
    const { container } = bogen(cas('case-copd'));
    expect(container.textContent).not.toMatch(/Frauenanamnese/);
    expect(placeholders(container)).not.toMatch(/Ausstrahlung/);
    expect(placeholders(container)).toMatch(/Luftnot/);
  });

  it('Leberzirrhose (homme, alcool) : la case Alkohol existe, pas de Frauenanamnese', () => {
    const { container } = bogen(cas('case-leberzirrhose'));
    expect(screen.getByText('Alkohol')).toBeTruthy();
    expect(container.textContent).not.toMatch(/Frauenanamnese/);
  });

  it('une patiente : la Frauenanamnese est là', () => {
    const femme = seedCases().find((c) => c.patientSheet.personalia.geschlecht === 'w')! as Case;
    const { container } = bogen(femme);
    expect(container.textContent).toMatch(/Frauenanamnese/);
  });

  it('INV-74 : une note déjà prise sous `frauen` reste visible, même pour un homme', () => {
    const { container } = bogen(cas('case-copd'), { frauen: 'notiert' });
    expect(screen.getByDisplayValue('notiert')).toBeTruthy();
    expect(container.textContent).not.toMatch(/Autres notes/);         // sa rubrique, à sa place — pas rejetée en « Autres notes »
  });

  it('les clés du Standard sont gardées (contrat §10.6) : noxen.rauchen et noxen.drogen', () => {
    const noxen = MUSTER_BOGEN.guide.fields.find((f) => f.key === 'noxen')!;
    expect(noxen.subFields!.map((s) => s.key)).toEqual(['rauchen', 'alkohol', 'drogen']);
  });
});

describe('I6 — Noxen en mode focus : une seule rubrique', () => {
  it('le champ à sous-cases écrit dans ses sous-clés, jamais dans la clé nue', () => {
    const noxen = MUSTER_BOGEN.guide.fields.find((f) => f.key === 'noxen')!;
    const setBogen = vi.fn();
    render(<NotizFeld field={noxen} bogen={{}} setBogen={setBogen} onEscape={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Alkohol'), { target: { value: '3 Bier/Tag' } });
    expect(setBogen).toHaveBeenCalledWith({ 'noxen.alkohol': '3 Bier/Tag' });
  });

  it('notée en focus, Noxen ne revient pas dans « Autres notes »', () => {
    const { container } = bogen(cas('case-leberzirrhose'), { 'noxen.alkohol': '3 Bier/Tag' });
    expect(container.textContent).not.toMatch(/Autres notes/);
    expect([...container.querySelectorAll('div')].filter((d) => d.textContent === 'Noxen')).toHaveLength(1);
  });
});
