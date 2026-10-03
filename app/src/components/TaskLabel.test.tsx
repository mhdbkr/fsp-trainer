import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ProgramBlock } from '@/db/types';
import { TaskLabel, taskSubject } from './TaskLabel';

const block = (over: Partial<ProgramBlock> = {}): ProgramBlock => ({
  kind: 'simulation', label: 'Divertikulitis', estMin: 20, ...over,
});

/** Texte VU à l'écran : les <title> des SVG sont le nom accessible du glyphe,
 *  pas un mot affiché — les compter comme du texte ferait passer pour un
 *  doublon ce qui est précisément l'alternative textuelle du dessin. */
const visibleText = (el: HTMLElement): string => {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('title').forEach((t) => t.remove());
  return clone.textContent ?? '';
};

describe('taskSubject — la concaténation de lib/program.ts ne passe pas dans la zone 2', () => {
  it('coupe au tiret cadratin (« X — Anamnese seule » → « X »)', () => {
    expect(taskSubject('Divertikulitis — Anamnese seule')).toBe('Divertikulitis');
    expect(taskSubject('Examen à blanc — simulation complète')).toBe('Examen à blanc');
    expect(taskSubject('Perikarditis — Couche 2')).toBe('Perikarditis');
  });
  it('garde le sujet à droite des libellés préfixés', () => {
    expect(taskSubject('Fachwissen : Perikarditis')).toBe('Perikarditis');
    expect(taskSubject('Révision : Divertikulitis')).toBe('Divertikulitis');
  });
  it('coupe au point médian (drill)', () => {
    expect(taskSubject('Drill · 12 dus + 8 nouveaux (≈ 14 min)')).toBe('Drill');
  });
  it('laisse intact un sujet déjà propre — la cale doit devenir une identité', () => {
    expect(taskSubject('Divertikulitis')).toBe('Divertikulitis');
    // Un tiret DANS un nom propre (pas entouré d'espaces) n'est pas un séparateur.
    expect(taskSubject('Morbus Crohn-Rezidiv')).toBe('Morbus Crohn-Rezidiv');
  });
});

describe('TaskLabel — anatomie (audit §4.2)', () => {
  it('zone 3 : la pastille de portée est ABSENTE quand la simulation est complète', () => {
    const { container } = render(<TaskLabel block={block()} />);
    expect(container.querySelector('.dim-tag')).toBeNull();
    // …et aucun mot ne vient dire « complète » : on le lit à l'absence.
    expect(visibleText(container)).not.toMatch(/complète|seule/i);
  });

  it('zone 3 : présente, en .dim-tag, et nommant le Teil SEUL', () => {
    const { container } = render(<TaskLabel block={block({ teil: 'anamnese' })} />);
    const tag = container.querySelector('.dim-tag');
    expect(tag).not.toBeNull();
    expect(tag!.textContent).toContain('Anamnese');
    expect(tag!.textContent).not.toMatch(/seule/i);
    // Un glyphe par Teil (DIRECTION-STYLE.md:119-122).
    expect(tag!.querySelector('svg')).not.toBeNull();
  });

  it('zone 1 : le type est un glyphe, jamais le mot « Simulation » écrit à côté', () => {
    const { container } = render(<TaskLabel block={block()} />);
    expect(visibleText(container)).not.toContain('Simulation');
    expect(container.querySelector('svg[aria-label="Simulation"]')).not.toBeNull();
  });

  it('zone 5 : la durée est une donnée — mono ET tabulaire (décision de charte du 17 sept.)', () => {
    const { container } = render(<TaskLabel block={block({ estMin: 9 })} />);
    const cost = [...container.querySelectorAll('.mono-tag')].find((n) => n.textContent?.includes('min'));
    expect(cost).toBeDefined();
    expect(cost!.classList.contains('tnum')).toBe(true);
  });

  it('zone 4 : couche et assistance en .label, jamais en mono capitales', () => {
    const { container } = render(<TaskLabel block={block({ layer: 2, assistance: 'assiste' })} />);
    const state = container.querySelector('.label');
    expect(state?.textContent).toBe('Couche 2 · assisté');
    expect(state?.className).not.toMatch(/font-mono|uppercase/);
  });

  it('drill : la zone 3 devient la paire de compteurs, pas une phrase', () => {
    render(<TaskLabel block={block({ kind: 'drill', label: 'Drill · 12 dus + 8 nouveaux' })} due={12} fresh={8} />);
    expect(screen.getByTitle('cartes dues').textContent).toBe('12 cartes dues');
    expect(screen.getByTitle('cartes nouvelles').textContent).toBe('8 cartes nouvelles');
    // Le mot est lu, pas vu : `title` seul n'est pas annoncé de façon fiable (fix-s3 M4).
    expect(screen.getByText('cartes dues').className).toContain('sr-only');
  });

  it('zone 3 : le glyphe du Teil est masqué SUR le svg, pas via un parent `display: contents` (fix-s3 M4)', () => {
    const { container } = render(<TaskLabel block={block({ teil: 'anamnese' })} />);
    const svg = container.querySelector('.dim-tag svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.hasAttribute('aria-label')).toBe(false);
  });

  it('le sujet n’est écrit qu’une fois : ni le type, ni la couche, ni la durée ne le doublent', () => {
    const { container } = render(<TaskLabel block={block({ label: 'Divertikulitis — Anamnese seule', teil: 'anamnese', layer: 2 })} />);
    const text = visibleText(container);
    expect(text.match(/Divertikulitis/g)?.length).toBe(1);
    expect(text.match(/Anamnese/g)?.length).toBe(1);
  });
});
