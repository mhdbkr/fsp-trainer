import { describe, expect, it } from 'vitest';
import type { Case } from '@/db/types';
import { compteursApresCas, ctxDuCas, playedTrame, profilDuCas, trameBrute } from './anamneseChapters';
import { PSY, byId, cas, cases, ch, coeur, ctx, prof, run, s, signesJoues, trameJouee, un, vue } from './coherenceFixtures';
import { RISIKO_SIGNES, cohere, compteursApres, type CohereCtx, type Ecart, type ProfilEffectif, type TrameChapter } from './coherence';
import { phraseFollowUps, phraseIsCaseSpecific, phraseProbes, phraseText, type Phrase } from './phrases';
import { SIGNE_DEF, phraseSucht, type Signe } from './symptoms';

// K3 — le moteur de cohérence (ADR-0023, contrat frage-atomique §10.4–§10.9). INV-81 à 88, 90, 91 sur fixtures
// (sondes réelles, textes de fixture) et sur les 130 cas ; les deux cas de la direction ligne à ligne (spec §3.3).
describe('INV-81 — un signe, une question (r2)', () => {
  it('la Fach l\'emporte sur Aktuelle Beschwerden (D4) ; l\'écart nomme le gagnant', () => {
    const r = run([ch('aktuell', s('akt-motiv'), s('akt-ausloeser')), ch('fach', s('fach-rheuma-ausloeser'))]);
    expect(vue(r.trame)).toEqual({ aktuell: ['akt-motiv'], fach: ['fach-rheuma-ausloeser'] });
    expect(un(r.ecarts, 'akt-ausloeser', 'retire')).toMatchObject({ regle: 2, signes: ['ausloeser'], cause: 'fach-rheuma-ausloeser' });
  });
  it('à rang égal, la première dans l\'ordre de la trame', () => {
    const r = run([ch('fach', s('fach-psych-ausloeser'), s('fach-rheuma-ausloeser'))]);
    expect(vue(r.trame).fach).toEqual(['fach-psych-ausloeser']);
  });
  it('une question du cas gagne et prend la place de la première perdante de son chapitre', () => {
    const r = run([ch('vegetativ', s('veg-gewicht'), s('veg-appetit'), cas(0, 'Wie viele Kilo?', ['gewicht']))]);
    expect(vue(r.trame).vegetativ).toEqual(['cas', 'veg-appetit']);
    expect(un(r.ecarts, 'cas:0', 'deplace')).toMatchObject({ regle: 2, cause: 'veg-gewicht' });
  });
  it('deux questions du cas du même signe : anomalie comptée (doublonsCas), la première gagne', () => {
    const r = run([ch('aktuell', cas(0, 'A?', ['schwindel']), cas(1, 'B?', ['schwindel', 'sturz']), cas(2, 'C?', ['schwindel']))]);
    expect(r.ecarts.filter((e) => e.action === 'anomalie').map((e) => [e.question, e.cause])).toEqual([['cas:1', 'cas:0'], ['cas:2', 'cas:0']]);
    expect(un(r.ecarts, 'cas:1', 'non-reduit')).toBeTruthy();
    expect(un(r.ecarts, 'cas:2', 'retire')).toBeTruthy();
  });
  it('sans `parts`, la perdante passe en non-réduite : hors du compteur doublons, comptée au résidu', () => {
    const t = [ch('aktuell', s('akt-allgemein-art')), ch('fach', s('fach-haem-leistung'))];
    const r = run(t);
    expect(un(r.ecarts, 'akt-allgemein-art', 'non-reduit')).toMatchObject({ signes: ['muedigkeit'], cause: 'fach-haem-leistung' });
    expect(compteursApres(r.trame, PSY, r.ecarts)).toMatchObject({ doublons: 0, nonReduit: 1 });
    expect(compteursApres(r.trame, PSY, []).doublons).toBe(1);   // mutation : sans l'écart, le compteur voit le doublon
  });
  it('la question du nom et son épellation (même sonde) ne sont pas un doublon', () => {
    const r = run([ch('personalia', s('pers-name', { text: 'Name?' }), s('pers-name', { text: 'Buchstabieren?' }))]);
    expect(vue(r.trame).personalia).toEqual(['pers-name', 'pers-name']);
    expect(r.ecarts).toEqual([]);
  });
  it('une exception COHERENCE_ALLOWED garde le signe sur la question nommée', () => {
    const allowed = [{ caseId: 'fx', question: 'akt-ausloeser', signe: 'ausloeser' as Signe, regle: 2 as const, raison: 'test', relecteur: 'test' }];
    const r = run([ch('aktuell', s('akt-ausloeser')), ch('fach', s('fach-rheuma-ausloeser'))], PSY, { allowed });
    expect(vue(r.trame).aktuell).toEqual(['akt-ausloeser']);
    expect(un(r.ecarts, 'akt-ausloeser', 'garde-exception')).toBeTruthy();
    expect(compteursApres(r.trame, PSY, r.ecarts).doublons).toBe(0);
  });
  it('130 cas : aucun doublon après montage ; la trame brute (r2 désactivé) en a', () => {
    let brut = 0;
    for (const c of cases) {
      expect(compteursApresCas(c).doublons, c.id).toBe(0);
      brut += compteursApres(trameBrute(c), profilDuCas(c), [], ctxDuCas(c).casIndex).doublons;
    }
    expect(brut).toBeGreaterThan(100);
  });
});

describe('INV-82 — rien hors profil (r1)', () => {
  const GASTRO = prof('ausscheidung', ['ausscheidung', 'diarrhoe']);
  const t = () => [
    ch('aktuell', s('akt-ausscheid-haeufigkeit'), s('akt-ausscheid-aussehen'), s('akt-ausscheid-schlucken'), cas(0, 'Strahlt es aus?', ['ausstrahlung'])),
    ch('fach', s('fach-infekt-gelenke'), s('fach-infekt-neuro')),
  ];
  it('retire une question tout hors profil ; garde entière (non réduite) une question sans parts', () => {
    const r = run(t(), GASTRO);
    expect(vue(r.trame)).toEqual({ aktuell: ['akt-ausscheid-haeufigkeit', 'akt-ausscheid-aussehen', 'cas'], fach: ['fach-infekt-neuro'] });
    expect(un(r.ecarts, 'akt-ausscheid-schlucken', 'retire')).toMatchObject({ regle: 1, cause: 'profil', signes: ['schluck'] });
    expect(un(r.ecarts, 'fach-infekt-gelenke', 'retire')).toMatchObject({ regle: 1, signes: ['arthralgie', 'gelenke'] });
    expect(un(r.ecarts, 'fach-infekt-neuro', 'non-reduit')).toMatchObject({ signes: ['meningismus', 'fazialis'] });
  });
  it('décision de main : r1 ne retire JAMAIS une question du cas (casRetiresParR1 = 0) — anomalie, hors du compteur', () => {
    const r = run(t(), GASTRO, ctx);
    expect(un(r.ecarts, 'cas:0', 'anomalie')).toMatchObject({ regle: 1, signes: ['ausstrahlung'] });
    expect(compteursApres(r.trame, GASTRO, r.ecarts, ctx.casIndex)).toMatchObject({ horsProfil: 0, casRetiresParR1: 0 });
    for (const c of cases) expect(compteursApresCas(c).casRetiresParR1, c.id).toBe(0);
  });
  it('réduit aux `parts` qui portent un signe pertinent', () => {
    const neuro = s('fach-infekt-neuro', { parts: [{ sucht: ['kopfschmerz', 'taubheit'], text: 'Kopf oder Kribbeln?' }, { sucht: ['meningismus', 'fazialis'], text: 'Nacken oder Gesicht?' }] });
    const r = run([ch('fach', neuro)], prof('ausscheidung', ['ausscheidung']));
    expect(r.trame[0].questions.map(phraseText)).toEqual(['Kopf oder Kribbeln?']);
    expect(un(r.ecarts, 'fach-infekt-neuro', 'reduit')).toBeTruthy();
  });
  it('un signe exclu par le profil (raison écrite) est retiré, cause « exclut »', () => {
    const r = run([ch('fach', s('fach-rheuma-gelenke'))], prof('schmerz', ['gelenk'], { exclut: { gelenke: 'douleur généralisée' } }));
    expect(un(r.ecarts, 'fach-rheuma-gelenke', 'retire')).toMatchObject({ cause: 'exclut' });
  });
  it('130 cas : aucune question hors profil après montage ; gastroenteritis sans « Schlucken », fibromyalgie sans « Welche Gelenke »', () => {
    for (const c of cases) expect(compteursApresCas(c).horsProfil, c.id).toBe(0);
    expect(coeur(byId('case-gastroenteritis')).aktuell).not.toContain('akt-ausscheid-schlucken');
    expect(coeur(byId('case-fibromyalgie')).fach).not.toContain('fach-rheuma-gelenke');
  });
});

describe('INV-83 — rien d\'attendu absent (r3)', () => {
  const DOULEUR = prof('ausscheidung', ['ausscheidung', 'schmerz']);
  it('ajoute la sonde de BANQUE de chaque signe exigé, à sa place (après le motif), marquée sans réponse si la fiche n\'en a pas', () => {
    const r = run([ch('aktuell', s('akt-motiv'), s('akt-beginn'))], DOULEUR);
    expect(vue(r.trame).aktuell).toEqual(['akt-motiv', 'akt-ort', 'akt-beginn', 'akt-charakter', 'akt-intensitaet']);
    const ajouts = r.ecarts.filter((e) => e.action === 'ajoute');
    expect(ajouts.map((e) => [e.question, e.signes[0], e.cause, e.sansReponse])).toEqual([
      ['akt-ort', 'ort', 'schmerz', true], ['akt-charakter', 'charakter', 'schmerz', true], ['akt-intensitaet', 'intensitaet', 'schmerz', true]]);
    for (const e of ajouts) expect(e.question).toBe(SIGNE_DEF[e.signes[0]].bank);
    const repondu = run([ch('aktuell', s('akt-motiv'))], DOULEUR, { antworten: { 'akt-ort': 'x', 'akt-charakter': 'x', 'akt-intensitaet': 'x' } });
    expect(repondu.ecarts.filter((e) => e.sansReponse)).toEqual([]);
    expect(compteursApres([ch('aktuell', s('akt-motiv'))], DOULEUR, []).exigeAbsent).toBe(3);   // mutation : r3 désactivé
  });
  it('130 cas : aucun signe exigé absent ; ajouteSansReponse = 0 (condition de merge)', () => {
    for (const c of cases) expect(compteursApresCas(c), c.id).toMatchObject({ exigeAbsent: 0, ajouteSansReponse: 0 });
  });
  it('décision 4 : la fréquence des selles est posée, sans condition, dans les cas de diarrhée (réponse de banque existante)', () => {
    for (const id of ['case-morbus-crohn', 'case-zoeliakie', 'case-chronische-pankreatitis']) {
      const c = byId(id);
      const t = playedTrame(c);
      expect(un(t.ecarts, 'akt-ausscheid-haeufigkeit', 'ajoute'), id).toMatchObject({ cause: 'diarrhoe' });
      expect(un(t.ecarts, 'akt-ausscheid-haeufigkeit', 'ajoute')!.sansReponse, id).toBeUndefined();
      const q = t.chapters.find((x) => x.id === 'aktuell')!.questions.find((p) => phraseProbes(p).includes('akt-ausscheid-haeufigkeit'))!;
      expect(phraseText(q), id).toMatch(/Wie oft haben Sie am Tag Stuhlgang/);   // entière, ou sa part du jour (P1-10)
      expect(c.patientSheet.antworten?.['akt-ausscheid-haeufigkeit'], id).toBeTruthy();
    }
  });
});

describe('INV-84 — une relance qui cherche un autre signe (r4a)', () => {
  const vorgeschichte = (cond = false) => s('fach-rheuma-vorgeschichte', {
    followUp: ['Gicht oder Nierensteine?', `${cond ? 'Falls ja: ' : ''}Rheuma in der Familie?`], followUpSucht: [['gicht', 'nierensteine'], ['familie_rheuma']] });
  const RHEUMA = prof('allgemein', ['gelenk', 'gicht']);   // rien d'exigé : r3 se tait
  it('inconditionnelle : détachée vers le chapitre de son signe, après la question de son signe', () => {
    const r = run([ch('fach', vorgeschichte()), ch('familie-sozial', s('fam-familie'))], RHEUMA);
    expect(vue(r.trame)).toEqual({ fach: ['fach-rheuma-vorgeschichte', '^fach-rheuma-vorgeschichte#1'], 'familie-sozial': ['fam-familie', '^fach-rheuma-vorgeschichte#2'] });
    expect(un(r.ecarts, 'fach-rheuma-vorgeschichte#2', 'detache')).toMatchObject({ de: 'fach', vers: 'familie-sozial' });
    expect(phraseFollowUps(r.trame[0].questions[0])).toEqual([]);
  });
  it('conditionnelle : anomalie (relancesOrphelines), elle reste sous sa mère', () => {
    const r = run([ch('fach', vorgeschichte(true)), ch('familie-sozial')], RHEUMA);
    expect(un(r.ecarts, 'fach-rheuma-vorgeschichte#2', 'anomalie')).toMatchObject({ regle: 4, cause: 'relance' });
    expect(compteursApres(r.trame, RHEUMA, r.ecarts).relancesOrphelines).toBe(1);
  });
  it('130 cas : seules cinq relances sont détachées (impfung → végétative, Gicht/Nierensteine, Familie Rheuma, Zungenbiss, Einnässen)', () => {
    const det = new Set(cases.flatMap((c) => playedTrame(c).ecarts.filter((e) => e.action === 'detache').map((e) => `${e.question} → ${e.vers}`)));
    expect([...det].sort()).toEqual(['akt-anfall-bewusstsein#1 → aktuell', 'akt-anfall-bewusstsein#2 → aktuell',
      'fach-rheuma-vorgeschichte#1 → fach', 'fach-rheuma-vorgeschichte#2 → familie-sozial', 'veg-fieber#5 → vegetativ']);
    for (const c of cases) expect(compteursApresCas(c).relancesOrphelines, c.id).toBe(0);
    expect(coeur(byId('case-rheumatoide-arthritis')).fach).toContain('^fach-rheuma-vorgeschichte#1');
  });
});

describe('INV-85 — rien avant son antécédent (r4b, `braucht`)', () => {
  it('« dort gegessen » se déplace juste après la question du voyage', () => {
    const r = run([ch('aktuell', s('akt-motiv'), cas(0, 'Was haben Sie dort gegessen?', ['essen_expo'], { braucht: ['reise'] })), ch('fach', s('fach-infekt-reise'), s('fach-infekt-impfung'))], prof('infekt', ['infekt']));   // le voyage n'est pertinent qu'en contexte infectieux (P1-11)
    expect(vue(r.trame)).toEqual({ aktuell: ['akt-motiv'], fach: ['fach-infekt-reise', 'cas', 'fach-infekt-impfung'] });
    expect(un(r.ecarts, 'cas:0', 'deplace')).toMatchObject({ regle: 4, de: 'aktuell', vers: 'fach', cause: 'reise' });
  });
  it('un `braucht` cherché nulle part, ou un cycle, est une anomalie ; sans r4b, la question est avant son antécédent', () => {
    const nulle = run([ch('aktuell', cas(0, 'Dort?', ['essen_expo'], { braucht: ['reise'] }))]);
    expect(un(nulle.ecarts, 'cas:0', 'anomalie')).toMatchObject({ cause: 'reise' });
    const cycle = run([ch('aktuell', cas(0, 'A', ['schwindel'], { braucht: ['sturz'] }), cas(1, 'B', ['sturz'], { braucht: ['schwindel'] }))]);
    expect(cycle.ecarts.some((e) => e.action === 'anomalie' && e.cause === 'cycle')).toBe(true);
    const brut = [ch('aktuell', cas(0, 'Dort?', ['essen_expo'], { braucht: ['reise'] })), ch('fach', s('fach-infekt-reise'))];
    expect(compteursApres(brut, PSY, [], ctx.casIndex).brauchtViole).toBe(1);   // mutation : r4b désactivé
  });
});

describe('INV-86 — pure, déterministe, idempotente', () => {
  const gele = <T,>(o: T): T => { if (o && typeof o === 'object') { Object.values(o).forEach(gele); Object.freeze(o); } return o; };
  type Moteur = typeof cohere;
  const estPure = (f: Moteur, t: TrameChapter[], p: ProfilEffectif) => { const avant = JSON.stringify(t); try { f(gele(structuredClone(t)), p, 'fx', ctx); } catch { return false; } return JSON.stringify(t) === avant; };
  const estDeterministe = (f: Moteur, t: TrameChapter[], p: ProfilEffectif) => JSON.stringify(f(t, p, 'fx', ctx)) === JSON.stringify(f(structuredClone(t), p, 'fx', ctx));
  const ACTIONS = ['retire', 'reduit', 'ajoute', 'deplace', 'detache'];
  const estIdempotente = (f: Moteur, t: TrameChapter[], p: ProfilEffectif, c: CohereCtx = ctx) => {
    const a = f(t, p, 'fx', c);
    const b = f(a.trame, p, 'fx', c);
    return JSON.stringify(b.trame) === JSON.stringify(a.trame) && !b.ecarts.some((e) => ACTIONS.includes(e.action));
  };
  const t = () => [ch('aktuell', s('akt-motiv'), s('akt-ausloeser'), s('akt-ausscheid-schlucken')), ch('fach', s('fach-rheuma-ausloeser'), s('fach-rheuma-vorgeschichte', {
    followUp: ['Rheuma in der Familie?'], followUpSucht: [['familie_rheuma']] })), ch('vegetativ', s('veg-schuettelfrost', { parts: [{ sucht: ['schuettelfrost'], text: 'S?' }, { sucht: ['nachtschweiss'], text: 'N?' }, { sucht: ['schwitzen'], text: 'W?' }] }), s('fach-endo-temperatur')), ch('familie-sozial')];
  const P = prof('schmerz', ['gelenk']);
  it('le moteur réel tient les trois propriétés (fixture)', () => {
    expect(estPure(cohere, t(), P)).toBe(true);
    expect(estDeterministe(cohere, t(), P)).toBe(true);
    expect(estIdempotente(cohere, t(), P)).toBe(true);
  });
  it('mutations : chaque garde rougit sur un moteur abîmé', () => {
    const mutant = ((tr, p, id, c) => { (tr[0].questions as Phrase[]).push('x'); return cohere(tr, p, id, c); }) as Moteur;
    expect(estPure(mutant, t(), P)).toBe(false);                         // muter l'entrée
    let n = 0;
    const hasard = ((tr, p, id, c) => { const r = cohere(tr, p, id, c); return n++ % 2 ? { ...r, ecarts: [...r.ecarts].reverse() } : r; }) as Moteur;
    expect(estDeterministe(hasard, t(), P)).toBe(false);                 // trancher selon l'appel (ordre instable)
    const ajouteToujours = ((tr: TrameChapter[], p: ProfilEffectif, id: string, c?: CohereCtx) => { const r = cohere(tr, p, id, c); return { trame: [...r.trame, ch('x', s('akt-ort'))], ecarts: [...r.ecarts, { regle: 3, action: 'ajoute', question: 'akt-ort', signes: ['ort'], raison: '' } as Ecart] }; }) as unknown as Moteur;
    expect(estIdempotente(ajouteToujours, t(), P)).toBe(false);          // un ajout à chaque passe
  });
  it('130 cas : cohere(cohere(t)) ne fait plus rien ; même entrée, même sortie ; la trame brute n\'est pas mutée', () => {
    for (const c of cases) {
      const brute = trameBrute(c);
      const avant = JSON.stringify(brute);
      const p = profilDuCas(c);
      const a = cohere(brute, p, c.id, ctxDuCas(c));
      expect(JSON.stringify(brute), c.id).toBe(avant);
      expect(JSON.stringify(cohere(brute, p, c.id, ctxDuCas(c))), c.id).toBe(JSON.stringify(a));
      const b = cohere(a.trame, p, c.id, ctxDuCas(c));
      expect(b.ecarts.filter((e) => ACTIONS.includes(e.action)).map((e) => e.raison), c.id).toEqual([]);
      expect(JSON.stringify(b.trame), c.id).toBe(JSON.stringify(a.trame));
    }
  });
});

describe('INV-87 — écarts complets', () => {
  // clé → identifiant d'écart. Une relance se reconnaît à son texte (une détachée décale l'index des suivantes) ;
  // son identifiant d'écart est celui de la trame BRUTE (`<mère>#<rang>`).
  const ids = (t: TrameChapter[], c: Case) => new Map(t.flatMap((x) => x.questions.flatMap((p) => {
    const v = typeof p === 'string' ? undefined : p;
    const id = v?.detacheDe ?? (phraseIsCaseSpecific(p) ? `cas:${ctxDuCas(c).casIndex!(p)}` : phraseProbes(p).join('+'));
    return id ? [[id, id] as const, ...phraseFollowUps(p).map((f, i) => [`${id}::${f.text}`, `${id}#${i + 1}`] as const)] : [];
  })));
  it('130 cas : un écart par (question, action) ; tout ce qui disparaît, apparaît ou bouge a son écart', () => {
    for (const c of cases) {
      const { ecarts } = playedTrame(c);
      const k = ecarts.map((e) => `${e.question}|${e.action}`);
      expect(new Set(k).size, c.id).toBe(k.length);
      const brut = ids(trameBrute(c), c), joue = ids(trameJouee(c), c);
      const vu = (q: string, actions: string[]) => ecarts.some((e) => e.question === q && actions.includes(e.action));
      for (const [k, q] of brut) if (!joue.has(k)) expect(vu(q, ['retire', 'reduit', 'detache']), `${c.id} ${q} disparaît`).toBe(true);
      for (const [k, q] of joue) if (!brut.has(k)) expect(vu(q, ['ajoute', 'detache']) || vu(q.replace(/#\d+$/, ''), ['ajoute', 'detache', 'reduit']), `${c.id} ${q} apparaît`).toBe(true);   // la relance d'une `part` gardée
    }
  });
  it('une mère retirée : chaque relance de précision a SON écart, lié par `mere`', () => {
    const r = run([ch('aktuell', s('akt-ausloeser', { followUp: ['Wann?', 'Wo?'] })), ch('fach', s('fach-rheuma-ausloeser'))]);
    expect(r.ecarts.filter((e) => e.mere === 'akt-ausloeser').map((e) => [e.question, e.action])).toEqual([['akt-ausloeser#1', 'retire'], ['akt-ausloeser#2', 'retire']]);
  });
});

describe('INV-88 — aucune réponse de fiche perdue', () => {
  it('130 cas : antworten intact ; tout signe retiré par r2 reste cherché par une question gardée', () => {
    for (const c of cases) {
      const avant = JSON.stringify(c.patientSheet.antworten);
      const { ecarts } = playedTrame(c);
      expect(JSON.stringify(c.patientSheet.antworten), c.id).toBe(avant);
      const cherches = signesJoues(trameJouee(c));
      for (const e of ecarts) if (e.regle === 2 && (e.action === 'retire' || e.action === 'reduit')) for (const x of e.signes) expect(cherches.has(x), `${c.id} ${e.question} ${x}`).toBe(true);
    }
  });
  it('r1 avant r2 : le gagnant hors profil est retiré d\'abord, le signe reste sur la question gardée par exception', () => {
    // `ausstrahlung` est hors profil (nature « allgemein ») ; une exception r1 le garde sur akt-ausstrahlung seulement.
    // Mutation (r2 avant r1) : la Fach gagnerait le signe, akt-ausstrahlung serait retirée, puis r1 retirerait la Fach — signe orphelin.
    const allowed = [{ caseId: 'fx', question: 'akt-ausstrahlung', signe: 'ausstrahlung' as Signe, regle: 1 as const, raison: 'test', relecteur: 'test' }];
    const r = run([ch('aktuell', s('akt-ausstrahlung')), ch('fach', s('fach-ortho-ausstrahlung'))], prof('allgemein', ['allgemein']), { allowed });
    expect(vue(r.trame)).toEqual({ aktuell: ['akt-ausstrahlung'], fach: [] });
    expect(signesJoues(r.trame).has('ausstrahlung')).toBe(true);
  });
});

describe('INV-90 — sans profil (contenu ancien) : r1 hors profil et r3 inactifs, r2 s\'applique', () => {
  it('un écart profil-absent ; la question hors profil reste ; rien n\'est ajouté ; le doublon est retiré', () => {
    const SANS: ProfilEffectif = { declare: false, tags: ['ausscheidung'], exige: {}, exclut: {} };
    const r = run([ch('aktuell', s('akt-ausscheid-schlucken'), s('akt-ausloeser')), ch('fach', s('fach-rheuma-ausloeser'))], SANS);
    expect(r.ecarts.map((e) => [e.action, e.question])).toEqual([['profil-absent', 'fx'], ['retire', 'akt-ausloeser']]);
    expect(vue(r.trame).aktuell).toEqual(['akt-ausscheid-schlucken']);
  });
});

describe('INV-91 — une relance de précision n\'est pas une unité', () => {
  const steif = (fs?: string[][]) => s('fach-rheuma-morgensteifigkeit', { followUp: ['Falls ja: Länger oder kürzer als eine halbe Stunde?'], ...(fs ? { followUpSucht: fs } : {}) });
  it('elle hérite du signe de sa mère : jamais comptée comme doublon, jamais retirée seule', () => {
    const P = prof('allgemein', ['steifigkeit']);
    const r = run([ch('fach', steif())], P);
    expect(r.ecarts).toEqual([]);
    expect(phraseFollowUps(r.trame[0].questions[0])).toHaveLength(1);
    expect(compteursApres(r.trame, P, r.ecarts).doublons).toBe(0);
  });
  it('mutation : déclarée sur un autre signe, elle devient une unité (ici conditionnelle : anomalie)', () => {
    const r = run([ch('fach', steif([['steifigkeit', 'dauer']]))], prof('allgemein', ['steifigkeit']));
    expect(un(r.ecarts, 'fach-rheuma-morgensteifigkeit#1', 'anomalie')).toBeTruthy();
  });
});

// SÉCURITÉ (décision de main, K3) — la garantie opposable : tout signe de risque cherché par la trame BRUTE reste cherché
// par au moins une question de la trame JOUÉE. r1 ne retire jamais une question de risque ; r2 s'applique (le gagnant D4 reste).
describe('SÉCURITÉ — aucun signe de risque n\'est perdu (r1 ne le retire jamais, r2 garde le gagnant)', () => {
  const psy = cases.filter((c) => playedTrame(c).fach?.chapter.id === 'fach-psy');
  const RISQUE = new Set<string>(RISIKO_SIGNES);   // copie : la mutation vide la table du moteur, pas celle du test
  const risques = (t: TrameChapter[]) => [...signesJoues(t)].filter((x) => RISQUE.has(x)).sort();
  const garantie = (brute: TrameChapter[], jouee: TrameChapter[]) => risques(brute).every((x) => risques(jouee).includes(x));
  it('130 cas : chaque signe de risque de la trame brute reste cherché par la trame jouée', () => {
    for (const c of cases) expect(risques(trameJouee(c)), c.id).toEqual(risques(trameBrute(c)));
  });
  it('10 cas psy : idéation, acte et désir d\'automutilation posés ; la question de sécurité n\'est posée qu\'UNE fois (D4 : la Fach psy l\'emporte)', () => {
    expect(psy).toHaveLength(10);
    for (const c of psy) {
      const t = trameJouee(c);
      const textes = t.flatMap((x) => x.questions.flatMap((p) => [phraseText(p), ...phraseFollowUps(p).map((f) => f.text)]));
      expect(textes, c.id).toContain('Haben Sie sich selbst verletzt?');
      expect(textes, c.id).toContain('Haben Sie den Wunsch, sich zu verletzen?');
      expect(risques(t), c.id).toEqual(['selbstverletzung', 'selbstverletzung_wunsch', 'suizid']);
      expect(t.flatMap((x) => x.questions).filter((p) => phraseSucht(p).includes('suizid')).flatMap(phraseProbes), c.id).toEqual(['fach-psych-suizid']);
      const sicherheit = playedTrame(c).ecarts.find((e) => e.question === 'akt-psych-sicherheit');
      if (sicherheit) expect(sicherheit, c.id).toMatchObject({ regle: 2, action: 'retire', cause: 'fach-psych-suizid' });
    }
  });
  it('mutation : sans la protection r1, un profil qui exclut les signes de risque les fait perdre — la garantie rougit', () => {
    const t = [ch('aktuell', s('akt-psych-sicherheit')), ch('fach', s('fach-psych-suizid'))];
    const p: ProfilEffectif = { ...PSY, exclut: { suizid: 'mutation', selbstverletzung: 'mutation', selbstverletzung_wunsch: 'mutation' } };
    expect(garantie(t, run(t, p).trame)).toBe(true);   // protégé : r1 n'y touche pas ; r2 garde la Fach (D4)
    expect(vue(run(t, p).trame)).toEqual({ aktuell: [], fach: ['fach-psych-suizid'] });
    const garde = [...RISIKO_SIGNES];
    (RISIKO_SIGNES as Set<Signe>).clear();
    try {
      expect(garantie(t, run(t, p).trame)).toBe(false);
    } finally { for (const x of garde) (RISIKO_SIGNES as Set<Signe>).add(x); }
  });
});

// ── Les deux cas de la direction, ligne à ligne (spec §3.3 ; écarts au rapport K3) ───────────────────────────────
describe('case-gastroenteritis et case-fibromyalgie — la trame jouée (cœur : Aktuelle Beschwerden, Fach, végétative)', () => {
  it('gastroenteritis : Schlucken et Gelenke retirés (r1), Ort / Charakter / Intensität ajoutés après le motif (r3, D2), fréquence des selles posée', () => {
    expect(coeur(byId('case-gastroenteritis'))).toEqual({
      aktuell: ['akt-motiv', 'akt-ort', 'akt-beginn', 'akt-charakter', 'akt-intensitaet', 'cas', 'akt-ausscheid-was', 'akt-ausscheid-haeufigkeit~stuhlfrequenz,stuhl_nachts', 'akt-ausscheid-aussehen',
        'akt-ausscheid-harn-haeufigkeit~nykturie', 'akt-verlauf', 'akt-ausloeser', 'akt-einfluss', 'akt-frueher', 'akt-begleit', 'cas', 'cas'],
      fach: ['fach-infekt-haut', 'fach-infekt-neuro', 'fach-infekt-reise', 'fach-infekt-kontakt', 'fach-infekt-impfung'],
      vegetativ: ['veg-schuettelfrost~schwitzen', 'veg-uebelkeit', 'veg-gewicht', 'veg-appetit', 'veg-schlaf', 'cas'],
    });
  });
  it('fibromyalgie : Ausstrahlung, Welche Gelenke, Gicht retirés (r1) ; Auslöser, Früher, Fieber une fois ; « Seit wann » gardé ; Impfungen en végétative', () => {
    const k = coeur(byId('case-fibromyalgie'));
    expect(k).toEqual({
      aktuell: ['akt-motiv', 'akt-ort', 'akt-beginn~beginn', 'akt-charakter', 'akt-intensitaet', 'akt-verlauf', 'akt-einfluss', 'akt-begleit', 'cas', 'cas', 'cas', 'cas', 'cas', 'cas'],
      fach: ['fach-rheuma-morgensteifigkeit', 'fach-rheuma-entzuendung', 'fach-rheuma-verlauf', 'fach-rheuma-ausloeser', 'fach-rheuma-haut', 'fach-rheuma-systemisch', 'fach-rheuma-vorgeschichte'],
      vegetativ: ['veg-schuettelfrost', 'veg-uebelkeit', 'veg-ausscheidung~miktion', 'veg-gewicht', 'veg-appetit', 'cas', '^veg-fieber#5'],
    });
  });
  it('spec §3.3 « une fois annotés » (K4 simulé) : les questions du cas gagnent (Ort, Verlauf, Steifigkeit, Entzündung) ; « dort » suit le voyage', () => {
    const annote = (id: string, decl: Array<[RegExp, Record<string, unknown>]>): Case => {
      const c = structuredClone(byId(id));
      c.caseSpecificQuestions = c.caseSpecificQuestions.map((q) => {
        const hit = typeof q !== 'string' && decl.find(([re]) => re.test(q.frage));
        return hit && typeof q !== 'string' ? { ...q, ...hit[1] } as typeof q : q;
      });
      return c;
    };
    const fibro = coeur(annote('case-fibromyalgie', [[/Zeichnung/, { sucht: ['ort'] }], [/drei Monaten/, { sucht: ['verlauf'] }], [/morgens steif/, { sucht: ['steifigkeit'] }], [/geschwollen, gerötet/, { sucht: ['gelenk_entzuendung'] }]]));
    expect(fibro.aktuell).not.toContain('akt-ort');
    expect(fibro.aktuell).not.toContain('akt-verlauf');
    expect(fibro.fach).not.toContain('fach-rheuma-morgensteifigkeit');
    expect(fibro.fach).not.toContain('fach-rheuma-entzuendung');
    const gastro = coeur(annote('case-gastroenteritis', [[/dort gegessen/, { sucht: ['essen_expo'], braucht: ['reise'] }]]));
    expect(gastro.fach.slice(2, 4)).toEqual(['fach-infekt-reise', 'cas']);
  });
});
