import { describe, expect, it } from 'vitest';
import { ALLGEMEINE_ANAMNESE, FACHANAMNESEN, LEITSYMPTOM_KATEGORIEN, adaptChaptersForCase, aktuellChapterFor, fachChapterForCase } from './anamneseChapters';
import { GRANULARITE_PAIRES, LEXIQUE, PROBE_SUCHT, PROFIL_EXIGE, SIGNES, SIGNE_DEF, TEXT_RE, lexiqueIncoherences, symptomsInText, type LexiqueTables } from './symptoms';
import { phraseFollowUp, phraseProbes, phraseText, splitDimension } from './phrases';
import type { Case } from '@/db/types';
import { cohere, type ProfilEffectif } from './coherence';

// K3 : `dedupeBySymptom` est remplacé par `cohere` ; ses deux tests de réduction par `parts` le rejouent (même attente).
const sansProfil: ProfilEffectif = { declare: false, tags: ['infekt'], exige: {}, exclut: {} };
const dedupe = (chapters: Array<{ id: string; questions: import('./phrases').Phrase[] }>) => cohere(chapters, sansProfil, 'fixture').trame;

const mk = (over: Partial<Case> & { kategorie?: Case['patientSheet']['leitsymptomKategorie'] } = {}): Case =>
  ({
    specialty: over.specialty ?? 'Pneumologie',
    patientSheet: { personalia: { name: 'X', age: 60, geschlecht: 'm' }, schmerz: {}, leitsymptomKategorie: over.kategorie ?? 'infekt' },
    caseSpecificQuestions: over.caseSpecificQuestions ?? [],
  } as unknown as Case);
const texts = (c: Case) => {
  const out: Array<[string, string]> = [];
  const fach = fachChapterForCase(c);
  for (const ch of adaptChaptersForCase(c)) {
    for (const q of ch.questions) out.push([ch.id, phraseText(q)]);
    if (fach && ch.id === 'aktuell') for (const q of fach.chapter.questions) out.push([fach.chapter.id, phraseText(q)]);
  }
  return out;
};
const count = (c: Case, re: RegExp) => texts(c).filter(([, t]) => re.test(t));

describe('Un symptôme, une question (FB2-J10)', () => {
  // K3 : la fièvre est toujours cherchée UNE fois ; sous D4 la Fach l'emporte (contrat frage-atomique §11.4 : « fach-infekt-fieber
  // l'emporte. Changement de comportement assumé »). Avant K3, FACH_COVERS la laissait à Aktuelle Beschwerden.
  it('CAP : la fièvre est cherchée une seule fois — dans la Fach (D4, contrat §11.4)', () => {
    const hits = count(mk(), /gemessen|Fieber oder Schüttelfrost|Fieber festgestellt/);
    expect(hits).toHaveLength(1);
    expect(hits[0][0]).toBe('fach-pneumo');
  });
  it('CAP : le Schüttelfrost (déjà dans la question fièvre) ne revient pas en vegetativ — il reste le Nachtschweiß', () => {
    const veg = texts(mk()).filter(([ch]) => ch === 'vegetativ').map(([, t]) => t);
    expect(veg.some((t) => /Schüttelfrost/.test(t))).toBe(false);
    expect(veg.some((t) => /Schwitzen Sie nachts/.test(t))).toBe(true);
  });
  it('CAP : le voyage (Fach pneumo) n’est pas redemandé en vegetativ', () => {
    expect(count(mk(), /Ausland/)).toHaveLength(0);
    expect(count(mk(), /Reise/)).toHaveLength(1);
  });
  it('BPCO (atemnot) : la Fach pose la fièvre, la vegetative ne la répète pas', () => {
    const hits = count(mk({ kategorie: 'atemnot' }), /Fieber/);
    expect(hits.map(([ch]) => ch)).toEqual(['fach-pneumo']);
  });
  it('douleur × chirurgie : « Haben Sie Fieber ? » (redundant) s’efface devant la vegetative, plus riche', () => {
    const hits = count(mk({ specialty: 'Chirurgie', kategorie: 'schmerz' }), /Fieber/);
    expect(hits.map(([ch]) => ch)).toEqual(['vegetativ']);
  });
  it('une question du cas avec `sucht` remplace la question générale de son chapitre', () => {
    const c = mk({ caseSpecificQuestions: [{ frage: 'Haben Sie sich gewogen? Wie viele Kilo?', kapitel: 'vegetativ', sucht: ['gewicht'] }] });
    const veg = texts(c).filter(([ch]) => ch === 'vegetativ').map(([, t]) => t);
    expect(veg.filter((t) => /Gewicht|gewogen/.test(t))).toEqual(['Haben Sie sich gewogen? Wie viele Kilo?']);
  });
  it('une question du cas sans `sucht` ne retire rien', () => {
    const c = mk({ caseSpecificQuestions: [{ frage: 'Wie viele Kilo?', kapitel: 'vegetativ', relu: true }] });
    expect(texts(c).filter(([, t]) => /Gewichtsveränderungen/.test(t))).toHaveLength(1);
  });
  it('r2 (ex-dedupeBySymptom) : une question réduite garde les relances de la partie restante', () => {
    const out = dedupe([
      { id: 'aktuell', questions: [{ text: 'Fieber?', probe: 'akt-infekt-fieber' }] },
      { id: 'vegetativ', questions: [{ text: 'Fieber? Ausland?', probe: 'veg-fieber', followUp: ['x', 'y'], parts: [
        { sucht: ['fieber'], text: 'Fieber?', followUp: ['x'] }, { sucht: ['reise'], text: 'Ausland?', followUp: ['y'] }] }] },
    ]);
    expect(out[1].questions.map(phraseText)).toEqual(['Ausland?']);
    expect(phraseFollowUp(out[1].questions[0])).toEqual(['y']);
    expect(phraseProbes(out[1].questions[0])).toEqual(['veg-fieber']);
  });
});

// Revue série 3, I5 : une partie qui ne déclare pas un symptôme de sa sonde
// laisse la réduction recoller les parties restantes (« Hatten Sie
// Schüttelfrost? Schwitzen Sie nachts…? » dans 6 cas endocriniens).
describe('parts ↔ PROBE_SUCHT (I5)', () => {
  const catalogue = [
    ...ALLGEMEINE_ANAMNESE, ...FACHANAMNESEN.map((f) => f.chapter), ...LEITSYMPTOM_KATEGORIEN.map((k) => aktuellChapterFor(k)),
  ].flatMap((ch) => ch.questions);
  it('l’union des `parts.sucht` d’une phrase couvre la carte de sa sonde, et n’en sort que vers ses relances déclarées (revue K1 m-2)', () => {
    const bad: string[] = [];
    for (const q of catalogue) {
      if (typeof q === 'string' || !q.parts) continue;
      const probe = phraseProbes(q)[0];
      const union = [...new Set(q.parts.flatMap((pt) => pt.sucht))].sort();
      const carte: readonly string[] = PROBE_SUCHT[probe] ?? [];
      const permis = new Set([...carte, ...(q.followUpSucht ?? []).flat()]);
      if (carte.some((x) => !union.includes(x)) || union.some((x) => !permis.has(x))) bad.push(`${probe}: parts [${union}] ≠ carte [${[...carte].sort()}] (+ relances [${[...permis].filter((x) => !carte.includes(x))}])`);
    }
    expect(bad).toEqual([]);
  });
  it('une réduction à plusieurs parties les pose une par une, jamais recollées', () => {
    const out = dedupe([
      { id: 'fach', questions: [{ text: 'Schwitzen?', probe: 'fach-endo-temperatur' }] },
      { id: 'vegetativ', questions: [{ text: 'Schüttelfrost, Nachtschweiß, Schweißausbrüche?', probe: 'veg-schuettelfrost', parts: [
        { sucht: ['schuettelfrost'], text: 'Schüttelfrost?' }, { sucht: ['nachtschweiss'], text: 'Nachts?' }, { sucht: ['schwitzen'], text: 'Schweißausbrüche?' }] }] },
    ]);
    expect(out[1].questions.map(phraseText)).toEqual(['Schüttelfrost?', 'Nachts?']);
  });
});

// Décision D4 : la polyurie n'est pas un trouble mictionnel. Poser la soif et
// le volume urinaire ne doit pas effacer « Wasserlassen » de la vegetative.
describe('polyurie ≠ miktion (D4)', () => {
  it('endocrino : la vegetative demande encore le Wasserlassen', () => {
    const veg = texts(mk({ specialty: 'Endokrinologie', kategorie: 'allgemein' })).filter(([ch]) => ch === 'vegetativ').map(([, t]) => t);
    expect(veg.some((t) => /Wasserlassen/.test(t))).toBe(true);
  });
});

describe('Dimension en tête de question (FB2-J11)', () => {
  it('extrait « Beginn », « Frühere Episoden », « Kontakt und Reise »', () => {
    expect(splitDimension('Beginn — Seit wann?')).toEqual({ dim: 'Beginn', body: 'Seit wann?' });
    expect(splitDimension('Frühere Episoden — Hatten Sie das schon?').dim).toBe('Frühere Episoden');
    expect(splitDimension('Kontakt und Reise — Waren Sie im Ausland?').dim).toBe('Kontakt und Reise');
  });
  it('laisse passer une question qui contient simplement un tiret', () => {
    expect(splitDimension('Wie sieht der Auswurf aus — Farbe und Menge?').dim).toBeUndefined();
    expect(splitDimension('Haben Sie Fieber, Nachtschweiß — so stark?').dim).toBeUndefined();
    expect(splitDimension('Gab es einen Auslöser — ein Essen?').dim).toBeUndefined();
  });
});

describe('Familienstand (FB2-J12)', () => {
  it('« Haben Sie Kinder ? » puis la relance ja/nein « wie viele, gesund »', () => {
    const q = adaptChaptersForCase(mk()).find((ch) => ch.id === 'familie-sozial')!.questions.find((x) => phraseProbes(x).includes('fam-stand'))!;
    expect(phraseText(q)).toBe('Wie ist Ihr Familienstand? Haben Sie Kinder?');
    expect(phraseFollowUp(q)).toEqual(['Falls ja: Wie viele, und sind sie gesund?']);
  });
});

// K0 — le lexique de signes (ADR-0023, contrat frage-atomique §10.1). Il n'est pas
// branché sur le montage : ce qui suit ne vérifie que sa cohérence statique.
// Chaque invariant a sa mutation : la même validation, sur une table abîmée, doit rougir.
describe('Lexique de signes — INV-77 (cohérent) et INV-78 (granularité)', () => {
  const mutated = (over: Partial<LexiqueTables>): LexiqueTables => ({ ...LEXIQUE, ...over });

  it('le lexique réel est cohérent', () => {
    expect(lexiqueIncoherences()).toEqual([]);
  });
  it('porte 219 signes : 69 de K0 (11 dimensions, 39 concepts d\u2019origine, 19 ajouts), puis ceux de K1 (137 + 9 de sa revue), `insektenstich` (revue K2 C3), `beginn_art`, `selbstverletzung_wunsch` et `stuhl_blut` (K3) ; le motif en tête (K3, règle d\u2019insertion) ; un SIGNE_DEF chacun', () => {
    expect(SIGNES).toHaveLength(219);
    expect(Object.keys(SIGNE_DEF)).toEqual([...SIGNES]);
    expect(SIGNES[0]).toBe('motiv');
    expect(SIGNES.slice(1, 13)).toEqual(['ort', 'beginn', 'beginn_art', 'charakter', 'intensitaet', 'ausstrahlung', 'verlauf', 'ausloeser', 'einfluss', 'frueher', 'begleit', 'gelenke']);
    expect(new Set(SIGNES).size).toBe(SIGNES.length);
  });
  it('tout signe de PROBE_SUCHT (déclaration, lue par le montage depuis K3) est un signe du lexique', () => {
    const inconnus = Object.values(PROBE_SUCHT).flat().filter((s) => !SIGNES.includes(s as never));
    expect(inconnus).toEqual([]);
  });

  it('INV-77 mutation : ausstrahlung exigé par « generalisiert » (qu\u2019il exclut) rougit', () => {
    const bad = lexiqueIncoherences(mutated({ exige: { ...PROFIL_EXIGE, generalisiert: ['ausstrahlung'] } }));
    expect(bad.some((m) => /generalisiert.*exige ET exclut|ne lui est pas pertinent/.test(m))).toBe(true);
  });
  it('INV-77 mutation : « stuhl » ajouté à la banque de stuhlfrequenz rougit', () => {
    const bad = lexiqueIncoherences(mutated({ sucht: { ...PROBE_SUCHT, 'akt-ausscheid-haeufigkeit': ['stuhlfrequenz', 'stuhl'] } }));
    expect(bad.some((m) => /akt-ausscheid-haeufigkeit.*ne cherche pas exactement/.test(m))).toBe(true);
  });
  it('INV-77 mutation : un signe exigé sans banque rougit', () => {
    const def = { ...SIGNE_DEF, ort: { ...SIGNE_DEF.ort, bank: undefined } };
    expect(lexiqueIncoherences(mutated({ def })).some((m) => /« ort » est exigé.*pas de banque/.test(m))).toBe(true);
  });
  it('INV-77 mutation : PROFIL_EXCLUT qui vise un signe de dépistage rougit', () => {
    expect(lexiqueIncoherences(mutated({ exclut: { generalisiert: ['fieber'] } })).some((m) => /signe de dépistage/.test(m))).toBe(true);
  });
  it('INV-77 mutation : un signe sans définition rougit', () => {
    const { ort: _o, ...def } = SIGNE_DEF;
    expect(lexiqueIncoherences(mutated({ def: def as typeof SIGNE_DEF })).some((m) => /« ort » n'a pas de définition/.test(m))).toBe(true);
  });
  it('INV-77 mutation : un tag exigeant un signe qui ne lui est pas pertinent rougit', () => {
    expect(lexiqueIncoherences(mutated({ exige: { ...PROFIL_EXIGE, diarrhoe: ['stuhlfrequenz', 'zecke'] } })).some((m) => /diarrhoe.*zecke.*pertinent/.test(m))).toBe(true);
  });
  it('INV-77 mutation : SUCHT_AUSSER sur un signe que la sonde ne cherche pas rougit', () => {
    expect(lexiqueIncoherences(mutated({ ausser: { 'fach-uro-flanke': { hoden: ['fieber'] } } })).some((m) => /ne cherche pas « fieber »/.test(m))).toBe(true);
  });

  // D1 : une énumération cherche chaque signe qu'elle nomme. Le lexique dit la même chose que la mesure.
  it('D1 : akt-ausscheid-was (« Wasserlassen, Stuhlgang, Farbe von Haut/Augen/Urin/Stuhl ») cherche tout ce qu\u2019elle nomme', () => {
    expect(PROBE_SUCHT['akt-ausscheid-was']).toEqual(expect.arrayContaining(['stuhl', 'miktion', 'gelbfaerbung', 'urin_aspekt', 'stuhlaussehen']));
  });

  it('D1 : fach-endo-durst (« häufiger Wasser lassen, auch nachts ») cherche aussi la nykturie', () => {
    expect(PROBE_SUCHT['fach-endo-durst']).toEqual(expect.arrayContaining(['durst', 'polyurie', 'nykturie']));
  });
  it('INV-78 : les paires de discrimination ont des sucht disjoints', () => {
    expect(GRANULARITE_PAIRES.length).toBeGreaterThanOrEqual(4);
    for (const [a, b] of GRANULARITE_PAIRES) expect(PROBE_SUCHT[a].filter((s) => PROBE_SUCHT[b].includes(s)), `${a} / ${b}`).toEqual([]);
  });
  it('INV-78 mutation : stuhlfrequenz fusionné dans stuhl — les deux sondes partagent un signe', () => {
    const bad = lexiqueIncoherences(mutated({ sucht: { ...PROBE_SUCHT, 'akt-ausscheid-haeufigkeit': ['stuhl'] } }));
    expect(bad.some((m) => /INV-78.*akt-ausscheid-was.*akt-ausscheid-haeufigkeit.*stuhl/.test(m))).toBe(true);
  });
  it('INV-78 mutation : polyurie fusionnée dans miktion rougit', () => {
    const bad = lexiqueIncoherences(mutated({ sucht: { ...PROBE_SUCHT, 'fach-endo-durst': ['durst', 'miktion'] } }));
    expect(bad.some((m) => /INV-78.*fach-endo-durst.*fach-uro-miktion/.test(m))).toBe(true);
  });
});

// K1 — `\b` n'existe pas devant une voyelle accentuée en JS (ä ö ü ne sont pas \w) : « Ist Ihnen übel ? » et
// « Haben Sie Ängste ? » n'étaient jamais lus par la lecture partagée. Le motif doit ancrer autrement.
describe('lecture du texte — les voyelles accentuées (défaut de K0)', () => {
  const signes = (t: string) => symptomsInText(t);
  it('« Ist Ihnen übel ? », « Übelkeit », « übergeben » sont lus comme `uebelkeit`', () => {
    for (const t of ['Ist Ihnen übel?', 'Haben Sie Übelkeit?', 'Mussten Sie sich übergeben?', 'Ist Ihnen während der Schmerzen übel?']) expect(signes(t), t).toContain('uebelkeit');
  });
  it('« Ängste » est lu comme `angst`', () => {
    expect(signes('Haben Sie Ängste, oder machen Sie sich viele Sorgen?')).toContain('angst');
  });
  it('pas de faux positif : « übelriechend », « Überweisung » ne sont pas de la nausée', () => {
    expect(signes('Riecht der Stuhl übelriechend?')).not.toContain('uebelkeit');
    expect(signes('Haben Sie eine Überweisung?')).not.toContain('uebelkeit');
  });
  it('garde : aucun motif du lexique ne place `\\b` contre une lettre accentuée', () => {
    const bad = TEXT_RE.flatMap(([s, re]) => (/\\b\(?(?:[^|)]*\|)*[äöüÄÖÜß]|[äöüÄÖÜß]\\b/.test(re.source) ? [`${s} : ${re.source}`] : []));
    expect(bad).toEqual([]);
  });
  it('mutation : l’ancien motif ne lit ni « übel » ni « Ängste » (ce que la garde attrape)', () => {
    const ancien = /\b(übel|übergeben|erbrochen|erbrechen)\b/i;
    expect(ancien.test('Ist Ihnen übel?')).toBe(false);
    expect(/\bangst\b|\bängste\b/i.test('Haben Sie Ängste?')).toBe(false);
    expect(/\\b\(?(?:[^|)]*\|)*[äöüÄÖÜß]|[äöüÄÖÜß]\\b/.test(ancien.source)).toBe(true);
  });
});
