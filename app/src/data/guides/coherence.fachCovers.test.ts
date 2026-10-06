import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { playedTrame, trameBrute } from './anamneseChapters';
import { phraseProbes } from './phrases';
import { PROBE_SUCHT, SUCHT_AUSSER } from './symptoms';
import { SIGNE_DU_MOTIF } from './coherence';

// K3 (contrat frage-atomique §10.10, §11.4) — `FACH_COVERS` est absorbé par r2. Chaque paire de l'ancienne table
// (« la sonde Fach F rend inutile la sonde de variante A », gelée par K0 dans `__snapshots__/fach-covers.txt`) est
// rejouée sur les cas qui jouent F et posent A : r2 retire A, ou l'écart est LISTÉ ci-dessous avec sa raison (rapport K3).
const PAIRES = readFileSync(join(__dirname, '__snapshots__/fach-covers.txt'), 'utf8').trim().split('\n')
  .flatMap((l) => { const [f, as] = l.split(' -> '); return as.split(', ').map((a) => [f, a] as const); });

type Raison = 'signe-distinct' | 'non-reduit' | 'reduit' | 'sucht-ausser' | 'd4-bis';
/** Les paires que r2 ne retire pas (sur au moins un cas), et pourquoi. */
const GARDEES: Record<string, Raison> = {
  // Signe distinct : l'ancienne table couvrait une AUTRE information que la Fach ne demande pas (règle d'identité).
  'fach-derma-aussehen -> akt-veraend-was': 'signe-distinct',
  'fach-gastro-speisen -> akt-ausloeser': 'signe-distinct',
  'fach-gastro-stuhl -> akt-ausscheid-haeufigkeit': 'signe-distinct',          // la fréquence des selles revient (décision 4) ; colitis : la question du cas la pose
  'fach-gefaess-schwellung -> akt-veraend-entwicklung': 'signe-distinct',
  'fach-gefaess-schwellung -> akt-veraend-was': 'signe-distinct',
  'fach-gyn-blutung -> akt-veraend-was': 'signe-distinct',
  'fach-gyn-brust -> akt-veraend-was': 'reduit',          // K4 : les parts d'akt-veraend-was (avant : non réduite)
  'fach-haem-lymphknoten -> akt-veraend-was': 'reduit',   // K4 : idem
  'fach-kardio-herzrasen -> akt-anfall-ablauf': 'signe-distinct',
  'fach-neuro-aura -> akt-anfall-ablauf': 'signe-distinct',
  'fach-neuro-koordination -> akt-neuro-lage': 'signe-distinct',
  'fach-psych-tagesverlauf -> akt-verlauf': 'reduit',   // revue P1-3 : la variante psy se réduit au cours
  'fach-onko-appetit -> akt-ausscheid-was': 'signe-distinct',
  // Le pont urinaire → selles (K1) : retiré (décision 3) ; depuis la revue P1-5, r1 retire la fréquence des selles hors diarrhée / transit.
  // Signe partagé, mais la question perdante n'a pas de `parts` : non réduite (résidu, K4 écrit les parts).
  'fach-gyn-blutung -> akt-veraend-blutung': 'reduit',
  'fach-haem-blutung -> akt-veraend-blutung': 'reduit',
  'fach-haem-blutverlust -> akt-veraend-blutung': 'reduit',
  'fach-onko-blutung -> akt-veraend-blutung': 'reduit',
  'fach-onko-knoten -> akt-veraend-was': 'reduit',        // K4 : les parts d'akt-veraend-was
  // K4 : aucun signe commun (schwaeche ≠ feinmotorik, sturz) ; « non réduite » tenait au signe `sturz` de la Fach neuro, que
  // les parts d'akt-nerven-alltag laissent désormais retirer.
  'fach-neuro-kraft -> akt-nerven-alltag': 'signe-distinct',
  // Signe partagé, la perdante a des `parts` : réduite à ce que la Fach ne demande pas (Appetit, Durst).
  'fach-haem-bsymptomatik -> akt-allgemein-gewicht': 'reduit',
  // D4-bis (décision de main, revue P1-1) : le signe du motif (la dyspnée d'un tableau dyspnéique) se pose dans Aktuelle
  // Beschwerden ; c'est la Fach qui cède.
  'fach-kardio-luft -> akt-atemnot-belastung': 'd4-bis',
  'fach-pneumo-atemnot -> akt-atemnot-belastung': 'd4-bis',
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
    // une relance détachée porte la sonde de sa mère (pour le simulant) : elle n'est pas la question de variante
    const joue = t.chapters.find((ch) => ch.id === 'aktuell')!.questions.filter((p) => typeof p === 'string' || !p.detacheDe).flatMap(phraseProbes);
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

  it('la table gelée a 73 paires ; 71 s\'appliquent à au moins un cas ; 23 restent posées (raison listée)', () => {
    expect(PAIRES).toHaveLength(73);
    expect(etat.size).toBe(71);
    expect(Object.keys(GARDEES)).toHaveLength(23);
  });
  it('les paires gardées sont exactement celles listées', () => {
    const gardees = [...etat].filter(([, s]) => s.retiree < s.n).map(([k]) => k).sort();
    expect(gardees).toEqual(Object.keys(GARDEES).sort());
  });
  it('quand r2 la retire, la question de variante disparaît sur TOUS les cas qui jouent la Fach', () => {
    // Une paire « signe distinct » peut être retirée sur un cas par une AUTRE question (ex. une question du cas) : pas par la Fach.
    const partielles = [...etat].filter(([k, s]) => s.retiree > 0 && s.retiree < s.n && !['sucht-ausser', 'signe-distinct', 'd4-bis'].includes(GARDEES[k])).map(([k]) => k);
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
      if (raison === 'd4-bis') expect(commun.some((x) => Object.values(SIGNE_DU_MOTIF).includes(x)), k).toBe(true);
      if (raison === 'sucht-ausser') expect(SUCHT_AUSSER[f]?.hoden ?? [], k).toEqual(commun);
    }
  });
});
