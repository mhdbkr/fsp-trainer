import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { toView } from '@/lib/collections/allTerms';
import { createPersonalTerm } from '@/lib/collections/personalTerms';
import { TermSheet } from './TermSheet';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});

const aszites = {
  id: 'fb-aszites', term: 'Aszites', translationSimple: 'Bauchwasser', definitionDetailed: 'Ansammlung freier Flüssigkeit in der Bauchhöhle.', pronunciation: 'asˈtsiːtəs',
  specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0),
  register: { patient: 'Mein Bauch wird immer dicker.', vorstellung: 'Sonographisch zeigte sich ein Aszites.', anamnese: 'Ist Ihr Bauch dicker geworden?' },
} as never;

describe('TermSheet (F4a D2/D3, AC-3)', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.personal_terms.clear(); });
  it('ordre : Bedeutung → Définition complète (repliée) → Dans l\'entretien (patient, demande, présentation) avec leur ligne d\'usage', () => {
    const { container } = render(<TermSheet term={aszites} />);
    const text = container.textContent!;
    const pos = ['Bedeutung', 'Définition complète', "Dans l'entretien", 'Le patient dit', 'Tu demandes', 'Tu présentes'].map((s) => text.indexOf(s));
    expect(pos.every((p) => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
    expect(container.querySelector('details')!.open).toBe(false);
    expect([...container.querySelectorAll('[data-usage]')].map((li) => li.getAttribute('data-usage'))).toEqual(['patient', 'anamnese', 'vorstellung']);
    for (const li of container.querySelectorAll('[data-usage]')) expect(li.querySelectorAll('p').length).toBe(2);
    expect(screen.getByText('Bauchwasser')).toBeTruthy();
  });
  it('sans registre : seulement la Bedeutung ; jamais « patientengerecht »', () => {
    const { container } = render(<TermSheet term={{ ...(aszites as object), register: undefined, definitionDetailed: undefined } as never} />);
    expect(container.textContent).not.toMatch(/Dans l'entretien|patientengerecht/i);
    expect(screen.getByText('Bauchwasser')).toBeTruthy();
  });
  it('compacte : Bedeutung seule, ni définition ni usages', () => {
    const { container } = render(<TermSheet term={aszites} compact />);
    expect(container.querySelector('details')).toBeNull();
    expect(container.textContent).not.toMatch(/Dans l'entretien/);
  });
  it('carte personnelle sans Bedeutung → « à compléter » ; modifiable (D8), le mot non', async () => {
    const { id } = await createPersonalTerm({ term: 'Belastungsdyspnoe', context: 'Seit Wochen Belastungsdyspnoe beim Treppensteigen.' });
    render(<TermSheet term={toView((await db.personal_terms.get(id))!)} />);
    expect(screen.getByText('à compléter')).toBeTruthy();
    expect(screen.getByText('Belastungsdyspnoe', { selector: 'mark' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: /terme|mot/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Modifier la Bedeutung' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Bedeutung' }), { target: { value: 'Atemnot bei Belastung' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(async () => expect((await db.personal_terms.get(id))!.explanation).toBe('Atemnot bei Belastung'));
    expect((await db.progress_events.toArray()).map((e) => e.type).sort()).toEqual(['term.personal_created', 'term.personal_updated']);
  });
  it('Échap ferme l\'éditeur et rend le focus à « Modifier » (revue C1)', async () => {
    const { id } = await createPersonalTerm({ term: 'Orthopnoe' });
    render(<TermSheet term={toView((await db.personal_terms.get(id))!)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier la Bedeutung' }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Bedeutung' }), { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Modifier la Bedeutung' })));
  });
});
