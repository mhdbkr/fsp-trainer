import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Fachwissen } from '@/db/types';
import type { VisualBlock as VisualBlockSpec } from '@/data/fachwissenVisuals/types';
import { registerVisual } from './registry';
import { VisualBlock } from './VisualBlock';

const fw: Fachwissen = {
  id: 'fw-test',
  pathology: 'Testkrankheit',
  specialty: 'Kardiologie',
  definition: 'Une définition.',
  klinik: [{ text: 'Thoraxschmerz' }],
  diagnostik: [{ stufe: 'Anamnese/Klinik', text: 'Schmerzanamnese' }],
  differenzialdiagnosen: [{ dd: 'Lungenembolie', unterscheidung: 'D-Dimer' }],
  therapie: [{ label: 'Erstlinie', items: ['ASS'] }],
} as unknown as Fachwissen;

function render(node: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(node));
  return { container, unmount: () => root.unmount() };
}

describe('VisualBlock', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('rend le composant enregistré sous VisualBlockFrame (data-visual, h3, titre)', () => {
    registerVisual('score-gauge' as never, function Fake({ block }: { block: VisualBlockSpec }) {
      return <p>Fake-{block.title}</p>;
    } as never);
    const block = {
      id: 'gauge-x',
      kind: 'score-gauge',
      title: 'Mon Score',
      anchor: 'klassifikation',
      replaces: [],
      data: {},
    } as unknown as VisualBlockSpec;

    const { container, unmount } = render(<VisualBlock block={block} fw={fw} />);
    expect(container.querySelector('[data-visual="score-gauge"]')).not.toBeNull();
    expect(container.querySelector('h3')?.textContent).toBe('Mon Score');
    expect(container.textContent).toContain('Fake-Mon Score');
    unmount();
  });

  it('kind non enregistré → ne rend rien, warn en dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const block = {
      id: 'unknown-x',
      kind: 'unknown-kind',
      title: 'Inconnu',
      anchor: 'klinik',
      replaces: [],
      data: {},
    } as unknown as VisualBlockSpec;

    const { container, unmount } = render(<VisualBlock block={block} fw={fw} />);
    expect(container.innerHTML).toBe('');
    unmount();
    warn.mockRestore();
  });

  it('composant qui rend null → le cadre entier disparaît (D7)', () => {
    registerVisual('anatomy-map' as never, function Null() {
      return null;
    } as never);
    const block = {
      id: 'anatomy-empty',
      kind: 'anatomy-map',
      title: 'Vide',
      anchor: 'klinik',
      replaces: [],
      data: {},
    } as unknown as VisualBlockSpec;

    const { container, unmount } = render(<VisualBlock block={block} fw={fw} />);
    expect(container.querySelector('[data-visual]')).toBeNull();
    unmount();
  });

  it('passe le slot after au cadre', () => {
    registerVisual('score-gauge' as never, function Fake() {
      return <p>x</p>;
    } as never);
    const block = {
      id: 'gauge-y',
      kind: 'score-gauge',
      title: 'Y',
      anchor: 'klassifikation',
      replaces: [],
      data: {},
    } as unknown as VisualBlockSpec;

    const { container, unmount } = render(
      <VisualBlock block={block} fw={fw} after={<details><summary>Text anzeigen</summary></details>} />,
    );
    expect(container.textContent).toContain('Text anzeigen');
    unmount();
  });
});
