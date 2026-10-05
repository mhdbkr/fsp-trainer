// Les mots du cadran (S4-4) : tout vient de `CaseDialData`, rien n'est calculé
// sur la mesure (INV-59). Les critères de la revue pédagogique sont des tests :
// jamais « ≥ » ni « % », la maîtrise jamais sans la couverture, `solideDes`
// futur ou passé, `pretManque` en mots du candidat.
import { describe, it, expect, afterEach } from 'vitest';
import { freezeAt, resetClock } from '@/lib/clock';
import type { CaseDialData } from '@/lib/dialData';
import { actionSuivante, etatTeil, etiquette, lienAction, lignesDetail, phrasePret, phraseSolideDes, resume } from './CaseDialText';

afterEach(() => resetClock());
const AUJOURDHUI = new Date(2026, 9, 5, 12).getTime();        // lundi 5 oct. 2026

type T = CaseDialData['teile']['anamnese'];
const t = (status: T['status'], lastScore: number | null = null, over: Partial<T> = {}): T =>
  ({ status, lastScore, lastAt: lastScore === null ? null : AUJOURDHUI - 3 * 86_400_000, nonMesure: false, solideDes: null, ...over });
const dial = (over: Partial<CaseDialData> = {}): CaseDialData => ({
  caseId: 'c1', teile: { anamnese: t('vierge'), dokumentation: t('vierge'), fallvorstellung: t('vierge') },
  couverture: 0, maitrise: null, soude: false, pretAt: null, pretManque: [], prochaineConsolidation: null, ...over,
});
const entame = dial({ teile: { anamnese: t('acquis', 78), dokumentation: t('vierge'), fallvorstellung: t('fragile', 54) }, couverture: 2, maitrise: 66 });

describe('étiquette accessible — la couleur n\'est jamais seule', () => {
  it('dit chaque Teil par son nom et son état, la maîtrise avec sa couverture', () => {
    freezeAt(AUJOURDHUI);
    const l = etiquette(entame, 'Leberzirrhose');
    expect(l).toContain('Leberzirrhose');
    expect(l).toContain('66 en moyenne sur 2 Teile');
    expect(l).toMatch(/Anamnese[^.]*acquis[^.]*78/);
    expect(l).toMatch(/Dokumentation[^.]*pas encore travaillé/);
    expect(l).toMatch(/Fallvorstellung[^.]*fragile[^.]*54/);
  });
  it('un cas vierge n\'a aucun chiffre et aucun défaut', () => {
    freezeAt(AUJOURDHUI);
    const l = etiquette(dial());
    expect(l).toContain('Pas encore travaillé');
    expect(l).not.toMatch(/\b0\b|fragile|à reprendre/);
  });
  it('un cas prêt le dit', () => {
    freezeAt(AUJOURDHUI);
    const s = { status: 'solide' as const, lastScore: 88, lastAt: AUJOURDHUI, nonMesure: false, solideDes: null };
    const l = etiquette(dial({ teile: { anamnese: s, dokumentation: s, fallvorstellung: s }, couverture: 3, maitrise: 88, soude: true, pretAt: AUJOURDHUI }));
    expect(l).toMatch(/prêt/i);
  });
  it('jamais « ≥ » ni « % » dans aucun texte', () => {
    freezeAt(AUJOURDHUI);
    const futur = dial({ ...entame, teile: { ...entame.teile, anamnese: t('acquis', 78, { solideDes: '2026-10-08' }) }, pretManque: ['autonome'] });
    const tout = [etiquette(futur, 'X'), resume(futur), phraseSolideDes('2026-10-08'), phrasePret(futur), JSON.stringify(lignesDetail(futur)), actionSuivante(futur).label].join('\n');
    expect(tout).not.toMatch(/≥|%/);
  });
});

describe('résumé — la maîtrise n\'est JAMAIS montrée sans la couverture', () => {
  it('« 74 en moyenne sur 2 Teile »', () => {
    expect(resume(dial({ couverture: 2, maitrise: 74 }))).toBe('74 en moyenne sur 2 Teile');
    expect(resume(dial({ couverture: 3, maitrise: 74 }))).toBe('74 en moyenne sur 3 Teile');
  });
  it('un seul Teil : pas de « moyenne »', () => {
    expect(resume(dial({ couverture: 1, maitrise: 41 }))).toBe('41 sur 1 Teil');
  });
  it('aucune maîtrise : aucun chiffre, jamais « 0 »', () => {
    expect(resume(dial())).toBe('Pas encore travaillé');
    expect(resume(dial({ teile: { ...dial().teile, anamnese: { ...t('vierge'), nonMesure: true } } }))).toBe('Fait — non mesuré');
  });
});

describe('états d\'un Teil', () => {
  it('vierge neutre, non mesurée à part', () => {
    expect(etatTeil(t('vierge'), '2026-10-05')).toBe('vierge');
    expect(etatTeil({ ...t('vierge'), nonMesure: true }, '2026-10-05')).toBe('non-mesure');
  });
  it('« à confirmer » : acquis dont la date de solidité est atteinte — pas un simple acquis', () => {
    expect(etatTeil(t('acquis', 85, { solideDes: '2026-10-05' }), '2026-10-05')).toBe('a-confirmer');
    expect(etatTeil(t('acquis', 85, { solideDes: '2026-10-04' }), '2026-10-05')).toBe('a-confirmer');
    expect(etatTeil(t('acquis', 85, { solideDes: '2026-10-08' }), '2026-10-05')).toBe('acquis');
    expect(etatTeil(t('acquis', 70), '2026-10-05')).toBe('acquis');
    expect(etatTeil(t('fragile', 50, { solideDes: '2026-10-04' }), '2026-10-05')).toBe('fragile');
  });
});

describe('R1 — solideDes, futur ou passé', () => {
  it('futur : « Solide si tu refais 80 ou plus à partir du jeudi 8 oct. »', () => {
    freezeAt(AUJOURDHUI);
    expect(phraseSolideDes('2026-10-08')).toBe('Solide si tu refais 80 ou plus à partir du jeudi 8 oct.');
  });
  it('passé ou aujourd\'hui : « Solide à ta prochaine partie à 80 ou plus. »', () => {
    freezeAt(AUJOURDHUI);
    expect(phraseSolideDes('2026-10-04')).toBe('Solide à ta prochaine partie à 80 ou plus.');
    expect(phraseSolideDes('2026-10-05')).toBe('Solide à ta prochaine partie à 80 ou plus.');
  });
  it('null : pas de phrase', () => {
    expect(phraseSolideDes(null)).toBeNull();
  });
  it('le détail porte la phrase sous le Teil concerné, et seulement lui', () => {
    freezeAt(AUJOURDHUI);
    const d = dial({ ...entame, teile: { ...entame.teile, anamnese: t('acquis', 78, { solideDes: '2026-10-08' }) } });
    const lignes = lignesDetail(d);
    expect(lignes.map((x) => x.teil)).toEqual(['anamnese', 'dokumentation', 'fallvorstellung']);
    expect(lignes[0].phrase).toMatch(/à partir du jeudi 8 oct\./);
    expect(lignes[1].phrase).toBeNull();
    expect(lignes[0].etat).toBe('acquis');
  });
});

describe('R1 — pretManque, en mots du candidat', () => {
  it('dit ce qui manque, rien d\'autre', () => {
    expect(phrasePret(dial({ pretManque: ['autonome'] }))).toBe('Pour être prêt : rejoue-le en Autonome.');
    expect(phrasePret(dial({ pretManque: ['autonome', 'grille'] }))).toBe('Pour être prêt : rejoue-le en Autonome, grille de langue remplie.');
    expect(phrasePret(dial({ pretManque: ['enchaine', 'autonome', 'ordre', 'grille'] }))).toBe(
      'Pour être prêt : rejoue-le d\'un trait, en Autonome, dans l\'ordre Anamnese, Dokumentation, Fallvorstellung, grille de langue remplie.');
  });
  it('aucun mot de conception : « souder » n\'est jamais dit au candidat', () => {
    for (const m of [['autonome'], ['enchaine', 'ordre']] as const) expect(phrasePret(dial({ pretManque: [...m] }))).not.toMatch(/soud/i);
    expect(phrasePret(dial({ soude: true }))).not.toMatch(/soud/i);
  });
  it('soudé : le dit, sans affirmation sur l\'examen', () => {
    const p = phrasePret(dial({ soude: true }));
    expect(p).toMatch(/^Prêt/);
    expect(p).not.toMatch(/examen|jury/i);
  });
  it('ni soudé ni manque : rien', () => {
    expect(phrasePret(dial())).toBeNull();
  });
});

describe('action suivante', () => {
  it('cas vierge : commencer (aucun Teil imposé)', () => {
    expect(actionSuivante(dial())).toEqual({ label: 'Commencer le cas', teil: null });
  });
  it('un Teil vierge dans un cas entamé : reprendre par lui, dans l\'ordre des Teile', () => {
    expect(actionSuivante(entame)).toEqual({ label: 'Reprendre par la Dokumentation', teil: 'dokumentation' });
  });
  it('sinon le fragile, puis l\'acquis', () => {
    const tout = dial({ teile: { anamnese: t('acquis', 78), dokumentation: t('solide', 90), fallvorstellung: t('fragile', 50) }, couverture: 3, maitrise: 73 });
    expect(actionSuivante(tout)).toEqual({ label: 'Retravailler la Fallvorstellung', teil: 'fallvorstellung' });
    const acquis = dial({ teile: { anamnese: t('acquis', 78), dokumentation: t('solide', 90), fallvorstellung: t('solide', 90) }, couverture: 3, maitrise: 86 });
    expect(actionSuivante(acquis)).toEqual({ label: 'Consolider l\'Anamnese', teil: 'anamnese' });
  });
  it('solide non soudé : rejouer d\'un trait ; soudé : rejouer le cas entier', () => {
    const s = t('solide', 90);
    const solide = dial({ teile: { anamnese: s, dokumentation: s, fallvorstellung: s }, couverture: 3, maitrise: 90, pretManque: ['autonome'] });
    expect(actionSuivante(solide)).toEqual({ label: 'Rejouer le cas d\'un trait', teil: null });
    expect(actionSuivante({ ...solide, pretManque: [], soude: true })).toEqual({ label: 'Rejouer le cas entier', teil: null });
  });
});

describe('lienAction', () => {
  it('mène au cas, sur le Teil proposé quand il y en a un', () => {
    expect(lienAction(entame)).toBe('/simulation/c1/pre?teil=dokumentation');
    expect(lienAction(dial())).toBe('/simulation/c1/pre');
  });
});
