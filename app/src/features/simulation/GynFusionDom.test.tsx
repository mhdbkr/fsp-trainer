import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { seedCases } from '@/data/seedCases';
import { AnamneseGuide } from './AnamneseGuide';

// Série 3, lot Q-gyn — mesuré dans le DOM de l'app (jsdom), pas depuis un
// module importé : le guide d'une patiente qui joue la Fach gynéco montre UN
// bloc, la Frauenanamnese en tête, et plus de chapitre « Frauenanamnese ».
const cases = seedCases();
const monte = (id: string) => {
  const c = cases.find((x) => x.id === id)!;
  return render(
    <MemoryRouter>
      <AnamneseGuide c={c} assistance="assiste" checkliste={[]} onItem={() => {}} hinweise={0} onHinweis={() => {}} />
    </MemoryRouter>,
  );
};
/** Position d'un texte dans le texte rendu (les mots-clés surlignés scindent les nœuds, pas le texte). */
const pos = (root: HTMLElement, needle: string) => {
  const i = (root.textContent ?? '').indexOf(needle);
  expect(i, needle).toBeGreaterThanOrEqual(0);
  return i;
};
const avant = (root: HTMLElement, a: string, b: string) => pos(root, a) < pos(root, b);

// Le premier montage charge les 130 cas : on laisse le temps.
const LONG = 60_000;
describe('Guide d’une patiente qui joue la Fach gynéco (DOM)', () => {
  it('un seul bloc : pas de chapitre « Frauenanamnese » à part, le bloc gynéco le porte', () => {
    const { container } = monte('case-adnexitis');
    const titres = [...container.querySelectorAll('button, h2, h3, span')].map((e) => (e.textContent ?? '').trim());
    expect(titres.some((t) => t === 'Frauenanamnese')).toBe(false);
    expect(titres.some((t) => /Frauen- und Fachanamnese Gynäkologie/.test(t))).toBe(true);
  }, LONG);

  it('l’ordre à l’écran : cycle → grossesse → contraception → saignement → douleur → écoulement → … → opérations', () => {
    const { container } = monte('case-adnexitis');
    const ordre = ['Verläuft Ihre Monatsblutung regelmäßig?', 'derzeit schwanger sind', 'Verwenden Sie Verhütungsmethoden?',
      'Hat sich Ihre Blutung verändert', 'Haben Sie Unterbauchschmerzen?', 'Haben Sie Ausfluss bemerkt?',
      'Wie viele Schwangerschaften und Geburten', 'Besteht ein Kinderwunsch', 'Wann waren Sie zuletzt bei der Vorsorge',
      'an den Eierstöcken operiert'];
    for (let i = 1; i < ordre.length; i++) expect(avant(container, ordre[i - 1], ordre[i]), `${ordre[i - 1]} avant ${ordre[i]}`).toBe(true);
  }, LONG);

  it('« Frauenarzt regelmäßig » n’est plus posé hors de la Vorsorge', () => {
    const { container } = monte('case-mammakarzinom');
    expect(container.textContent).not.toMatch(/Gehen Sie regelmäßig zum Frauenarzt/);
    expect(container.textContent).toMatch(/bei der Vorsorge/);
  }, LONG);
});
