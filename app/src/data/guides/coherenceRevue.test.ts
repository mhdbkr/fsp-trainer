import { describe, expect, it } from 'vitest';
import { PROBE_BY_ID } from './anamneseProbes';
import { PSY, cas, ch, prof, run, s, signesJoues, un, vue } from './coherenceFixtures';

// K3 — corrections des revues Opus de `508639f6` (mécanique B1, I1, M1, M4 ; clinique P0–P2). Fixtures : sondes réelles.

describe('B1 — une relance hors signe vit sa propre décision, même si sa mère est retirée par r1 (§10.4, INV-87)', () => {
  it('mère `fach-infekt-gelenke` hors profil psy, relance `selbstverletzung_wunsch` : la mère part, la relance est détachée', () => {
    const mere = s('fach-infekt-gelenke', { followUp: ['Haben Sie den Wunsch, sich zu verletzen?'], followUpSucht: [['selbstverletzung_wunsch']] });
    const r = run([ch('fach', mere)], PSY);
    expect(un(r.ecarts, 'fach-infekt-gelenke', 'retire')).toBeTruthy();
    expect(un(r.ecarts, 'fach-infekt-gelenke#1', 'detache')).toBeTruthy();
    expect(vue(r.trame).fach).toEqual(['^fach-infekt-gelenke#1']);
    expect(signesJoues(r.trame).has('selbstverletzung_wunsch')).toBe(true);
  });
});

describe('I1 — règle d\'insertion « précède OU ÉGALE » (§10.4)', () => {
  it('la relance détachée se pose APRÈS la question du chapitre cible qui a le même premier signe', () => {
    const vorg = s('fach-rheuma-vorgeschichte', { followUp: ['Rheuma in der Familie?'], followUpSucht: [['familie_rheuma']] });
    const famille = s('fam-familie', { text: 'Familie: Rheuma, chronische Krankheiten?', sucht: ['familie_rheuma', 'familie_krank'] });
    const r = run([ch('fach', vorg), ch('familie-sozial', famille)], prof('allgemein', ['gelenk']));
    expect(vue(r.trame)['familie-sozial']).toEqual(['fam-familie~familie_rheuma,familie_krank', '^fach-rheuma-vorgeschichte#1']);
  });
});

describe('M1 — r3 puis r4b : une question qui présuppose un signe AJOUTÉ par r3 se place après lui', () => {
  it('cas « schmerz » : `braucht: [ort]` → la question du cas suit akt-ort, inséré par r3 après le motif', () => {
    const r = run([ch('aktuell', cas(0, 'Strahlt es von dort aus?', ['ausstrahlung'], { braucht: ['ort'] }), s('akt-motiv'))], prof('schmerz', ['schmerz']));
    expect(vue(r.trame).aktuell.slice(0, 3)).toEqual(['akt-motiv', 'akt-ort', 'cas']);
    expect(un(r.ecarts, 'cas:0', 'deplace')).toMatchObject({ regle: 4, cause: 'ort' });
  });
});

describe('M4 — r3 sans phrase de banque échoue franchement (jamais un id affiché comme question)', () => {
  it('la banque introuvable lève une erreur', () => {
    const garde = PROBE_BY_ID['akt-ort'];
    delete (PROBE_BY_ID as Record<string, unknown>)['akt-ort'];
    try {
      expect(() => run([ch('aktuell', s('akt-motiv'))], prof('schmerz', ['schmerz']))).toThrow(/akt-ort/);
    } finally { PROBE_BY_ID['akt-ort'] = garde; }
  });
});
