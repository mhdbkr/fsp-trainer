import { describe, expect, it } from 'vitest';
import { bogenKeysFor } from './bogenKeys';
import type { Phrase } from '@/data/guides/phrases';

// Q-gyn (revue m2) : dans le bloc Frauen- und Fachanamnese Gynäkologie, seules
// les questions de la Frauenanamnese vont dans la rubrique « frauen » du Bogen ;
// les signes gynécologiques (Blutung, Unterbauch…) restent dans le comportement
// d'avant pour une Fach (Hauptbeschwerde).
const bloc: Phrase[] = [
  { text: 'Verläuft Ihre Monatsblutung regelmäßig?', probe: 'frau-periode' },
  { text: 'Besteht die Möglichkeit …?', probe: 'frau-schwanger' },
  { text: 'Haben die Unterbauchschmerzen kurz nach …?', caseSpecific: true },
  { text: 'Hat sich Ihre Blutung verändert?', probe: 'fach-gyn-blutung' },
  { text: 'Haben Sie Unterbauchschmerzen?', probe: 'fach-gyn-unterbauch' },
];
describe('Bogen — rubrique des notes du bloc gynéco', () => {
  it('les questions frau-* (et celles du cas rangées avec elles) → « frauen »', () => {
    expect([0, 1, 2].map((ii) => bogenKeysFor('fach-gyn', bloc, ii))).toEqual([['frauen'], ['frauen'], ['frauen']]);
  });
  it('l’intro du chapitre (ii = −1) est la tête du bloc : « frauen »', () => {
    expect(bogenKeysFor('fach-gyn', bloc, -1)).toEqual(['frauen']);
  });
  it('les signes gynécologiques → comportement d’avant (aucune rubrique forcée, donc Hauptbeschwerde)', () => {
    expect([3, 4].map((ii) => bogenKeysFor('fach-gyn', bloc, ii))).toEqual([[], []]);
  });
  it('les autres chapitres gardent leur table', () => {
    expect(bogenKeysFor('frauenanamnese', [], 0)).toEqual(['frauen']);
    expect(bogenKeysFor('noxen', [], 0)).toEqual(['noxen', 'genussmittel']);
    expect(bogenKeysFor('fach-kardio', [], 0)).toEqual([]);
  });
});
