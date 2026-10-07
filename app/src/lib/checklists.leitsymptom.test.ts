// Série 3, point 2b : l'item « Aktuelle Beschwerden » de l'Anamnese suit la NATURE du motif. Une Schmerzanalyse (OPQRST)
// demandée pour une dépression ou une pneumonie est un gabarit copié sans lecture du cas (DIRECTION-STYLE §2.1).
// L'id, le coefficient et le `kapitel` ne bougent pas (simulation-run.md §4) : seul le libellé se lit sur le cas.
import { describe, it, expect } from 'vitest';
import type { LeitsymptomKategorie } from '@/db/types';
import { checklistFor } from './checklists';

const KATEGORIEN: LeitsymptomKategorie[] = ['schmerz', 'atemnot', 'allgemein', 'psychisch', 'neurologisch', 'nerven', 'infekt', 'veraenderung', 'ausscheidung', 'anfall'];
const aktuell = (k?: LeitsymptomKategorie) => checklistFor('anamnese', k).find((i) => i.id === 'anam-aktuell-opqrst')!;

describe('2b — l’item Aktuelle Beschwerden selon la nature du motif', () => {
  it('cas douloureux : Schmerzanalyse (OPQRST)', () => {
    expect(aktuell('schmerz').label).toMatch(/Schmerzanalyse \(OPQRST\)/);
  });

  it.each(KATEGORIEN.filter((k) => k !== 'schmerz'))('%s : ni douleur ni OPQRST, libellé propre à la nature', (k) => {
    expect(aktuell(k).label).not.toMatch(/Schmerz|OPQRST/);
    expect(aktuell(k).label).toMatch(/^Aktuelle Beschwerden/);
  });

  it('chaque nature a son libellé (pas un libellé unique pour tous)', () => {
    expect(new Set(KATEGORIEN.map((k) => aktuell(k).label)).size).toBe(KATEGORIEN.length);
  });

  it('sans cas (rappels transversaux, validateurs) : libellé neutre, sans douleur', () => {
    expect(aktuell().label).not.toMatch(/Schmerz|OPQRST/);
  });

  it.each([undefined, ...KATEGORIEN])('%s : id, coefficient ×2, kapitel et ordre inchangés', (k) => {
    const liste = checklistFor('anamnese', k);
    expect(liste.map((i) => i.id)).toEqual(checklistFor('anamnese').map((i) => i.id));
    expect(liste[2]).toMatchObject({ id: 'anam-aktuell-opqrst', axisWeight: 2, kapitel: 'aktuell', checked: false });
  });

  it('les autres Teile ignorent la nature du motif', () => {
    expect(checklistFor('dokumentation', 'psychisch')).toEqual(checklistFor('dokumentation'));
  });
});
