import { describe, expect, it } from 'vitest';
import type { Case } from '@/db/types';
import { seedCases } from '@/data/seedCases';
import { cqFollowUp, cqFollowUps } from '@/lib/caseQuestions';
import { playedTrame } from './anamneseChapters';
import { phraseFollowUp, phraseProbes, phraseText, type Phrase } from './phrases';
import { phraseSucht } from './symptoms';

// Lot Q3 — les renvois « lot de contenu » des revues K3, K4 et K5, relus sur la trame JOUÉE (ce que l'écran pose).
// Chaque `it` est un renvoi ; le rapport `lead-s3-q3.md` donne l'avant / après et la source de chaque réponse écrite.
const cases = seedCases();
const byId = (id: string) => cases.find((c) => c.id === id)!;
const joue = (c: Case): Array<[string, Phrase]> => {
  const { chapters, fach } = playedTrame(c);
  return chapters.flatMap((ch) => [
    ...ch.questions.map((p) => [ch.id, p] as [string, Phrase]),
    ...(fach && ch.id === 'aktuell' ? fach.chapter.questions.map((p) => ['fach', p] as [string, Phrase]) : []),
  ]);
};
/** Tout ce que le candidat dit dans la trame jouée : questions et relances. */
const dit = (id: string) => joue(byId(id)).flatMap(([, p]) => [phraseText(p), ...phraseFollowUp(p)]);
const rang = (id: string, test: (p: Phrase) => boolean) => joue(byId(id)).findIndex(([, p]) => test(p));
const texte = (s: string) => (p: Phrase) => phraseText(p) === s;
const sonde = (probe: string) => (p: Phrase) => phraseProbes(p).includes(probe);
const fa = (id: string, frage: string) => byId(id).patientSheet.frageAntworten?.find((x) => x.frage === frage)?.antwort;
const cq = (id: string, frage: string) => byId(id).caseSpecificQuestions.find((q) => typeof q !== 'string' && q.frage === frage);

describe('Q3 — renvois cliniques des revues K3–K5, sur la trame jouée', () => {
  it('anaphylaxie : « Pfeift es beim Atmen? » reste en Aktuelle Beschwerden ; le spray suit la mention de l\'asthme', () => {
    expect(dit('case-anaphylaxie').some((t) => /Pfeift es beim Atmen\?$/.test(t))).toBe(true);
    const spray = rang('case-anaphylaxie', texte('Haben Sie Ihr Asthmaspray dabei?'));
    expect(spray).toBeGreaterThan(rang('case-anaphylaxie', sonde('vor-erkrank')));
    expect(joue(byId('case-anaphylaxie'))[spray][0]).toBe('medikamente');
    expect(dit('case-anaphylaxie').filter((t) => /Asthmaspray/.test(t))).toEqual(['Haben Sie Ihr Asthmaspray dabei?']);
    expect(fa('case-anaphylaxie', 'Haben Sie Ihr Asthmaspray dabei?')).toMatch(/vergessen/);
  });

  it('anorexia-nervosa n° 2 : « selbst herbei » et la relance de veg-uebelkeit ; la réponse veg-uebelkeit raccourcie, le vomissement passe à la n° 2', () => {
    const q = cq('case-anorexia-nervosa', 'Ich frage das ganz ohne Vorwurf: Kommt es vor, dass Sie sich nach dem Essen übergeben?')!;
    expect(cqFollowUps(q)).toEqual(['Falls ja: Führen Sie das Erbrechen selbst herbei?', 'Falls ja: Wie häufig kommt das vor?', 'Falls ja: Seit wann?', 'Falls ja: Können Sie das Erbrochene beschreiben?']);
    const pose = joue(byId('case-anorexia-nervosa')).find(([, p]) => phraseText(p) === (q as { frage: string }).frage)!;
    expect(phraseFollowUp(pose[1])).toHaveLength(4);
    expect(byId('case-anorexia-nervosa').patientSheet.antworten?.['veg-uebelkeit']).toBe('Übel ist mir nicht, nein.');
    expect(fa('case-anorexia-nervosa', (q as { frage: string }).frage)).toMatch(/Zwei- oder dreimal die Woche/);
    // la végétative ne redemande pas le vomissement
    expect(joue(byId('case-anorexia-nervosa')).filter(([, p]) => phraseSucht(p).includes('erbrechen'))).toHaveLength(1);
  });

  it('schlaganfall : la chute quitte akt-einfluss ; la n° 4 (« beim Sturz », Fach) obtient sa réponse', () => {
    const s = byId('case-schlaganfall').patientSheet;
    expect(s.antworten?.['akt-einfluss']).toBe('Ob ich mich hinlege oder bewege, ändert nichts.');
    expect(fa('case-schlaganfall', 'Haben Sie sich beim Sturz von der Kellertreppe den Kopf gestoßen?')).toMatch(/Knie/);
    expect(rang('case-schlaganfall', texte('Haben Sie sich beim Sturz von der Kellertreppe den Kopf gestoßen?')))
      .toBeGreaterThan(rang('case-schlaganfall', sonde('fach-neuro-koordination')));
  });

  it('hypothyreose : l\'épuisement après la naissance n\'est plus redemandé — akt-frueher le dit', () => {
    expect(byId('case-hypothyreose').patientSheet.antworten?.['akt-frueher']).toMatch(/nach der Geburt/);
    expect(dit('case-hypothyreose').filter((t) => /Entbindung/.test(t))).toEqual([]);
  });

  it('malaria : la vaccination pneumocoque n\'est demandée qu\'une fois (fach-infekt-impfung)', () => {
    expect(byId('case-malaria').patientSheet.antworten?.['fach-infekt-impfung']).toMatch(/Pneumokokken/);
    expect(dit('case-malaria').filter((t) => /Pneumokokken/.test(t))).toEqual([]);
    expect(dit('case-malaria').some((t) => /Meningokokken/.test(t))).toBe(true);
  });

  it('sturz-im-alter : plus de « Wann war der erste Anfall? » ; la question du cas prend la place du Beginn', () => {
    expect(dit('case-sturz-im-alter').filter((t) => /erste Anfall/.test(t))).toEqual([]);
    const aktuell = playedTrame(byId('case-sturz-im-alter')).chapters.find((ch) => ch.id === 'aktuell')!.questions;
    expect(aktuell.findIndex(texte('Wann genau ist das passiert?'))).toBe(2);   // motif, Ort, puis le moment de la chute
    expect(rang('case-sturz-im-alter', sonde('akt-beginn'))).toBe(-1);
  });

  it('fibromyalgie : un seul seuil (30 min), une seule « Augenentzündung », des « Beschwerden » et non des « Gelenkbeschwerden »', () => {
    const t = dit('case-fibromyalgie');
    expect(t).toContain('Wie lange sind Sie morgens steif — ein paar Minuten oder länger als eine halbe Stunde?');
    expect(t.filter((x) => /Stunde/.test(x) && /steif/.test(x))).toEqual(['Wie lange sind Sie morgens steif — ein paar Minuten oder länger als eine halbe Stunde?']);
    expect(byId('case-fibromyalgie').patientSheet.antworten?.['fach-rheuma-morgensteifigkeit']).toMatch(/Länger als eine halbe Stunde war es noch nie/);
    expect(t.filter((x) => /Bindehaut/.test(x))).toEqual([]);
    expect(t.filter((x) => /Gelenkbeschwerden/.test(x))).toEqual([]);
    expect(t).toContain('Hatten Sie solche Beschwerden schon einmal?');
  });

  it('gib et tvt : le bloc « Veränderung » de lésion cutanée ne parle plus de douche, de soleil ni de démangeaison', () => {
    for (const id of ['case-gib', 'case-tvt']) {
      const t = dit(id).join(' ¶ ');
      expect(t, id).not.toMatch(/beim Duschen|Sonne|juckt es/);
      expect(joue(byId(id)).some(([, p]) => phraseSucht(p).includes('beginn')), id).toBe(true);   // le Beginn reste demandé
    }
  });

  it('tvt : l\'hémoptysie (embolie) est demandée, la fiche la nie', () => {
    const k = rang('case-tvt', texte('Haben Sie Blut abgehustet?'));
    expect(k).toBeGreaterThan(rang('case-tvt', texte('Haben Sie Luftnot, Herzrasen oder Schmerzen beim Atmen bemerkt?')));
    expect(phraseSucht(joue(byId('case-tvt'))[k][1])).toEqual(['haemoptyse']);
    expect(fa('case-tvt', 'Haben Sie Blut abgehustet?')).toMatch(/^Nein/);
  });

  it('schenkelhalsfraktur : la mobilité avant la chute est demandée (Rollator, à la main de la fille)', () => {
    const k = rang('case-schenkelhalsfraktur', texte('Wie gut konnten Sie vor dem Sturz gehen — brauchten Sie eine Gehhilfe?'));
    expect(k).toBeGreaterThan(-1);
    expect(fa('case-schenkelhalsfraktur', 'Wie gut konnten Sie vor dem Sturz gehen — brauchten Sie eine Gehhilfe?')).toMatch(/Rollator/);
  });

  it('parkinson : une question, plus une consigne (« Schauen Sie sich bitte … an »)', () => {
    expect(dit('case-parkinson').filter((t) => /Schauen Sie sich bitte/.test(t))).toEqual([]);
    expect(dit('case-parkinson')).toContain('Ist Ihnen aufgefallen, dass Ihre Schrift zum Ende der Zeile hin kleiner wird?');
  });

  it('appendizitis n° 2 : la nausée est demandée avant d\'être datée par rapport à la douleur', () => {
    const q = cq('case-appendizitis', 'Ist Ihnen übel, oder mussten Sie erbrechen?')!;
    expect(cqFollowUp(q)).toBe('Falls ja: Kam das erst, nachdem die Schmerzen begonnen hatten?');
    expect(dit('case-appendizitis').filter((t) => /^Kam die Übelkeit/.test(t))).toEqual([]);
  });

  it('psy : la tentative antérieure est demandée dans le bloc de sécurité, et chacune des 10 fiches y répond', () => {
    const psy = cases.filter((c) => playedTrame(c).fach?.chapter.id === 'fach-psy');
    expect(psy).toHaveLength(10);
    for (const c of psy) {
      expect(dit(c.id), c.id).toContain('Haben Sie schon einmal versucht, sich das Leben zu nehmen?');
      expect(c.patientSheet.antworten?.['fach-psych-suizid'], c.id).toMatch(/versuch|nie etwas angetan/i);
    }
  });

  it('« oder Schmerzen » (akt-begleit, variante nerven) : réduite, la question garde les douleurs', () => {
    const [, p] = joue(byId('case-parkinson')).find(([, x]) => phraseProbes(x).includes('akt-begleit'))!;
    expect(phraseText(p)).toMatch(/Schmerzen/);
  });
});
