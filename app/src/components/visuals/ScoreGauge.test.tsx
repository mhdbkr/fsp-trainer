import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ScoreGauge } from './ScoreGauge';
import type { ScoreGaugeData, VisualBlock } from '@/data/fachwissenVisuals/types';
import type { Fachwissen } from '@/db/types';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

const fw = {
  id: 'fw-leberzirrhose',
  pathology: 'Leberzirrhose',
  specialty: 'Gastroenterologie',
  definition: 'x',
  klinik: [],
  klassifikation: [{ name: 'Child-Pugh', inhalt: 'Bilirubin, Albumin, INR, Aszites, Enzephalopathie' }],
  diagnostik: [],
  differenzialdiagnosen: [],
  therapie: [],
} as unknown as Fachwissen;

function makeBlock(interactive: boolean): VisualBlock & { kind: 'score-gauge'; data: ScoreGaugeData } {
  const criteria: ScoreGaugeData['criteria'] = [
    { label: 'Bilirubin', points: [1, 2, 3], source: 'ergänzt' },
    { label: 'Albumin', points: [1, 2, 3], source: 'ergänzt' },
    { label: 'INR', points: [1, 2, 3], source: 'ergänzt' },
    { label: 'Aszites', points: [1, 2, 3], source: 'ergänzt' },
    { label: 'Enzephalopathie', points: [1, 2, 3], source: 'ergänzt' },
  ];
  const data: ScoreGaugeData = {
    score: { name: 'Child-Pugh-Score', ref: { section: 'klassifikation', name: 'Child-Pugh' } },
    criteria,
    bands: [
      { label: 'Child A', min: 5, max: 6, tone: 'accent', source: 'ergänzt' },
      { label: 'Child B', min: 7, max: 9, tone: 'warn', source: 'ergänzt' },
      { label: 'Child C', min: 10, max: 15, tone: 'signal', source: 'ergänzt' },
    ],
    interactive,
  };
  return {
    id: 'score-child-pugh',
    kind: 'score-gauge',
    title: 'Child-Pugh-Score',
    replaces: [],
    anchor: 'klassifikation',
    data,
  };
}

describe('ScoreGauge', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('sélectionner le max de chaque critère donne 15 et la bande Child C', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<ScoreGauge block={makeBlock(true)} fw={fw} />);
    });

    const radios = Array.from(container.querySelectorAll('[role="radio"]')) as HTMLButtonElement[];
    // 5 critères x 3 points ; sélectionner le 3ème bouton (valeur 3) de chaque groupe
    act(() => {
      for (let g = 0; g < 5; g++) {
        radios[g * 3 + 2].click();
      }
    });

    const total = container.querySelector('[data-testid="score-total"]');
    expect(total?.textContent).toContain('15');

    const meter = container.querySelector('[role="meter"]');
    expect(meter?.getAttribute('aria-valuenow')).toBe('15');
    expect(meter?.getAttribute('aria-valuetext')).toContain('Child C');

    root.unmount();
  });

  it('Zurücksetzen revient au minimum', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<ScoreGauge block={makeBlock(true)} fw={fw} />);
    });

    const radios = Array.from(container.querySelectorAll('[role="radio"]')) as HTMLButtonElement[];
    act(() => {
      for (let g = 0; g < 5; g++) radios[g * 3 + 2].click();
    });
    expect(container.querySelector('[data-testid="score-total"]')?.textContent).toContain('15');

    const resetBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Zurücksetzen'),
    ) as HTMLButtonElement;
    act(() => {
      resetBtn.click();
    });

    expect(container.querySelector('[data-testid="score-total"]')?.textContent).toContain('5');

    root.unmount();
  });

  it('role=meter porte aria-valuemin/max/now', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<ScoreGauge block={makeBlock(true)} fw={fw} />);
    });

    const meter = container.querySelector('[role="meter"]');
    expect(meter?.getAttribute('aria-valuemin')).toBe('5');
    expect(meter?.getAttribute('aria-valuemax')).toBe('15');
    expect(meter?.hasAttribute('aria-valuenow')).toBe(true);

    root.unmount();
  });

  it('aucun emoji dans le rendu', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<ScoreGauge block={makeBlock(true)} fw={fw} />);
    });
    expect(EMOJI_RE.test(container.innerHTML)).toBe(false);
    root.unmount();
  });

  it('ArrowRight déplace la sélection ET le focus clavier (I2)', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<ScoreGauge block={makeBlock(true)} fw={fw} />);
    });

    const radios = Array.from(container.querySelectorAll('[role="radio"]')) as HTMLButtonElement[];
    const firstGroup = radios.slice(0, 3);
    firstGroup[0].focus();
    expect(document.activeElement).toBe(firstGroup[0]);

    act(() => {
      firstGroup[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(document.activeElement).toBe(firstGroup[1]);
    expect(firstGroup[1].getAttribute('aria-checked')).toBe('true');

    root.unmount();
  });

  it('le total porte aria-live="polite"', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<ScoreGauge block={makeBlock(true)} fw={fw} />);
    });

    const total = container.querySelector('[data-testid="score-total"]');
    expect(total?.getAttribute('aria-live')).toBe('polite');

    root.unmount();
  });

  it('criteria vide → jauge statique des bandes', () => {
    const block = makeBlock(false);
    block.data.criteria = [];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<ScoreGauge block={block} fw={fw} />);
    });
    expect(container.querySelectorAll('[role="radio"]').length).toBe(0);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(1);
    root.unmount();
  });
});
