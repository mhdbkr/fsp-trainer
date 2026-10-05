import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { playedTrame, trameBrute } from './anamneseChapters';
import { phraseProbes } from './phrases';
import { PROBE_SUCHT, SUCHT_AUSSER } from './symptoms';

// K3 (contrat frage-atomique §10.10, §11.4) — `FACH_COVERS` est absorbé par r2. Chaque paire de l'ancienne table
// (« la sonde Fach F rend inutile la sonde de variante A », gelée par K0 dans `__snapshots__/fach-covers.txt`) est
// rejouée sur les cas qui jouent F et posent A : r2 retire A, ou l'écart est LISTÉ ci-dessous avec sa raison (rapport K3).
const PAIRES = readFileSync(join(__dirname, '__snapshots__/fach-covers.txt'), 'utf8').trim().split('\n')
  .flatMap((l) => { const [f, as] = l.split(' -> '); return as.split(', ').map((a) => [f, a] as const); });

type Raison = 'signe-distinct' | 'non-reduit' | 'reduit' | 'sucht-ausser';
/** Les paires que r2 ne retire pas (sur au moins un cas), et pourquoi. */
const GARDEES: Record<string, Raison> = {
  // Signe distinct : l'ancienne table couvrait une AUTRE information que la Fach ne demande pas (règle d'identité).
  'fach-derma-aussehen -> akt-veraend-was': 'signe-distinct',
  'fach-derma-beginn-ort -> akt-veraend-entwicklung': 'signe-distinct',
  'fach-derma-muttermal -> akt-veraend-entwicklung': 'signe-distinct',
  'fach-gastro-speisen -> akt-ausloeser': 'signe-distinct',
  'fach-gastro-stuhl -> akt-ausscheid-haeufigkeit': 'signe-distinct',          // la fréquence des selles revient (décision 4) ; colitis : la question du cas la pose
  'fach-gefaess-schwellung -> akt-veraend-entwicklung': 'signe-distinct',
  'fach-gefaess-schwellung -> akt-veraend-was': 'signe-distinct',
  'fach-gyn-blutung -> akt-veraend-was': 'signe-distinct',
  'fach-gyn-brust -> akt-veraend-was': 'signe-distinct',
  'fach-haem-lymphknoten -> akt-veraend-was': 'signe-distinct',
  'fach-kardio-herzrasen -> akt-anfall-ablauf': 'signe-distinct',
  'fach-neuro-aura -> akt-anfall-ablauf': 'signe-distinct',
  'fach-neuro-koordination -> akt-neuro-lage': 'signe-distinct',
  'fach-neuro-verlauf -> akt-verlauf': 'signe-distinct',
  'fach-psych-tagesverlauf -> akt-verlauf': 'signe-distinct',
  'fach-onko-appetit -> akt-ausscheid-was': 'signe-distinct',
  // Revue P0-1 : « Blut, Schleim im Stuhl » cherche le sang dans les selles (stuhl_blut), pas l'aspect du urine.
  'fach-nephro-aussehen -> akt-ausscheid-aussehen': 'signe-distinct',
  'fach-uro-farbe -> akt-ausscheid-aussehen': 'signe-distinct',
  // Le pont urinaire → selles (K1) : retiré, décision 3 de main — une Fach urologique ne pose pas la fréquence des selles.
  'fach-nephro-menge -> akt-ausscheid-haeufigkeit': 'signe-distinct',
  'fach-uro-drang -> akt-ausscheid-haeufigkeit': 'signe-distinct',
  'fach-uro-frequenz -> akt-ausscheid-haeufigkeit': 'signe-distinct',
  'fach-uro-strahl -> akt-ausscheid-haeufigkeit': 'signe-distinct',
  // Signe partagé, mais la question perdante n'a pas de `parts` : non réduite (résidu, K4 écrit les parts).
  'fach-gyn-blutung -> akt-veraend-blutung': 'non-reduit',
  'fach-haem-blutung -> akt-veraend-blutung': 'non-reduit',
  'fach-haem-blutverlust -> akt-veraend-blutung': 'non-reduit',
  'fach-onko-blutung -> akt-veraend-blutung': 'non-reduit',
  'fach-onko-knoten -> akt-veraend-was': 'non-reduit',
  'fach-kardio-oedeme -> akt-atemnot-nachts': 'non-reduit',
  'fach-neuro-kraft -> akt-nerven-alltag': 'non-reduit',
  // Signe partagé, la perdante a des `parts` : réduite à ce que la Fach ne demande pas (Appetit, Durst).
  'fach-haem-bsymptomatik -> akt-allgemein-gewicht': 'reduit',
  // L'exception testiculaire, devenue règle générique (SUCHT_AUSSER, tag dérivé `hoden`) : case-hodentorsion.
  'fach-uro-flanke -> akt-ausstrahlung': 'sucht-ausser',
};

describe('FACH_COVERS absorbé par r2 — chaque paire retirée, ou gardée pour une raison listée', () => {
  const cases = seedCases();
  const etat = new Map<string, { n: number; retiree: number; ecarts: string[] }>();
  for (const c of cases) {
    const brute = trameBrute(c);
    const fach = brute.find((ch) => ch.id === 'fach')?.questions.flatMap(phraseProbes) ?? [];
    const akt = brute.find((ch) => ch.id === 'aktuell')!.questions.flatMap(phraseProbes);
    const t = playedTrame(c);
    const joue = t.chapters.find((ch) => ch.id === 'aktuell')!.questions.flatMap(phraseProbes);
    for (const [f, a] of PAIRES) {
      if (!fach.includes(f) || !akt.includes(a)) continue;
      const k = `${f} -> ${a}`;
      const s = etat.get(k) ?? { n: 0, retiree: 0, ecarts: [] };
      s.n++;
      if (!joue.includes(a)) s.retiree++;
      else s.ecarts.push(...t.ecarts.filter((e) => e.question === a).map((e) => e.action));
      etat.set(k, s);
    }
  }

  it('la table gelée a 73 paires ; 71 s\'appliquent à au moins un cas ; 31 restent posées (raison listée)', () => {
    expect(PAIRES).toHaveLength(73);
    expect(etat.size).toBe(71);
    expect(Object.keys(GARDEES)).toHaveLength(31);
  });
  it('les paires gardées sont exactement celles listées', () => {
    const gardees = [...etat].filter(([, s]) => s.retiree < s.n).map(([k]) => k).sort();
    expect(gardees).toEqual(Object.keys(GARDEES).sort());
  });
  it('quand r2 la retire, la question de variante disparaît sur TOUS les cas qui jouent la Fach', () => {
    // Une paire « signe distinct » peut être retirée sur un cas par une AUTRE question (ex. une question du cas) : pas par la Fach.
    const partielles = [...etat].filter(([k, s]) => s.retiree > 0 && s.retiree < s.n && !['sucht-ausser', 'signe-distinct'].includes(GARDEES[k])).map(([k]) => k);
    expect(partielles).toEqual([]);
  });
  it('chaque raison se vérifie dans les données', () => {
    for (const [k, raison] of Object.entries(GARDEES)) {
      const [f, a] = k.split(' -> ');
      const commun = PROBE_SUCHT[f].filter((s) => PROBE_SUCHT[a].includes(s));
      const ecarts = etat.get(k)!.ecarts;
      if (raison === 'signe-distinct') expect(commun, k).toEqual([]);
      if (raison === 'non-reduit') expect(ecarts, k).toContain('non-reduit');
      if (raison === 'reduit') expect(ecarts, k).toContain('reduit');
      if (raison === 'sucht-ausser') expect(SUCHT_AUSSER[f]?.hoden ?? [], k).toEqual(commun);
    }
  });
});
