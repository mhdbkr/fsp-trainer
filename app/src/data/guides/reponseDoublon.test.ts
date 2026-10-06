import { describe, expect, it } from 'vitest';
import type { Case } from '@/db/types';
import { seedCases } from '@/data/seedCases';
import { playedTrame } from './anamneseChapters';
import { phraseIsCaseSpecific, phraseProbes, phraseText } from './phrases';
import { phraseSucht, symptomsInText, type Signe } from './symptoms';

// Q4 — garde anti-doublon : « la réponse dit ce que la question suivante demande » (trouvé trois fois par la revue
// clinique de Q3 : copd, parkinson, anaphylaxie). Pour chaque question du cas de la trame JOUÉE, aucune réplique d'une
// sonde posée AVANT elle ne contient les mots-clés d'un signe que la question cherche (`sucht`).
// Mots-clés = `symptomsInText` (TEXT_RE, la seule lecture du lexique). `pers-groesse` dit le poids du jour : il ne
// compte pour `gewicht` que s'il dit une VARIATION (« vor zwei Monaten waren es noch 72 »).
// ponytail : seuls les signes que TEXT_RE sait lire sont vus ; un signe propre au cas sans motif (« stuhl_nachts »,
// « kompression ») échappe. D'où une garde stricte sur les cas relus par Q4 et un PLAFOND sur les 130 cas
// (mesuré : origin/main 107, Q4 87) — il ne remonte jamais ; le baisser quand un lot traite des constats.
const PLAFOND = 87;

type Constat = { cas: string; signe: Signe; sonde: string; question: string };

const VARIATION = /abgenommen|zugenommen|waren es|vorher|früher/i;

function constats(c: Case): Constat[] {
  const { chapters, fach } = playedTrame(c);
  const units = chapters.flatMap((ch) => [...ch.questions, ...(fach && ch.id === 'aktuell' ? fach.chapter.questions : [])]);
  const vus: Array<{ sonde: string; signes: Set<Signe> }> = [];
  const out: Constat[] = [];
  for (const p of units) {
    if (phraseIsCaseSpecific(p)) {
      for (const signe of phraseSucht(p)) for (const v of vus) if (v.signes.has(signe)) out.push({ cas: c.id, signe, sonde: v.sonde, question: phraseText(p) });
      continue;
    }
    const sonde = phraseProbes(p)[0];
    const reponse = sonde ? c.patientSheet.antworten?.[sonde] : undefined;
    if (!reponse) continue;
    const signes = new Set(symptomsInText(reponse));
    if (sonde === 'pers-groesse' && !VARIATION.test(reponse)) signes.delete('gewicht');
    vus.push({ sonde, signes });
  }
  return out;
}

// Les cas relus par Q4 (composées d'`aktuell`, zoeliakie → malaria, et les renvois). Chaque constat restant est
// écrit ici avec sa raison : un faux positif de la lecture par mots-clés, jamais un doublon laissé.
const CAS_Q4 = ['zoeliakie', 'ulcus-cruris', 'leistenhernie', 'commotio', 'itp', 'uterus-myomatosus', 'akutes-nierenversagen',
  'fibromyalgie', 'polymyalgia', 'schlafapnoe', 'schizophrenie', 'delir', 'achalasie', 'spinalkanalstenose', 'laktoseintoleranz',
  'tia', 'diabetes-typ1', 'gastroenteritis', 'rheumatisches-fieber', 'influenza', 'metabolisches-syndrom', 'karzinoid', 'abszess',
  'anorexia-nervosa', 'malaria', 'opioidabhaengigkeit', 'mammakarzinom', 'morbus-crohn', 'karpaltunnel'].map((s) => `case-${s}`);
const ADMIS: Record<string, string> = {
  'case-leistenhernie|stuhl|akt-veraend-was': 'la réplique nie un lien avec le Stuhlgang ; la question demande s\'il faut pousser',
  'case-schlafapnoe|schlaf|akt-motiv': 'le motif nomme le sommeil (« mit meinem Schlaf stimmt etwas nicht ») sans en dire la durée',
  'case-achalasie|reise|veg-fieber': 'la réplique dit l\'Espagne ; la question demande l\'Amérique centrale ou du Sud (Chagas)',
  'case-gastroenteritis|stuhl|akt-motiv': 'la question déclare `stuhl` pour retirer la végétative ; le motif dit la diarrhée, pas l\'aspect',
  'case-gastroenteritis|stuhl|akt-verlauf': 'idem : la fréquence de la diarrhée, pas l\'aspect des selles',
  'case-gastroenteritis|stuhl|akt-einfluss': 'idem : « nach dem Stuhlgang » (ce qui soulage), pas l\'aspect',
};

describe('Q4 — une réplique jouée avant une question du cas ne dit pas déjà ce qu\'elle cherche', () => {
  const tous = seedCases().flatMap(constats);

  it(`les 130 cas : informatif, plafond ${PLAFOND} (il ne remonte pas)`, () => {
    // Le relevé complet, pour le lot qui traitera le reste (Q5 et suivants).
    console.info(`[reponseDoublon] ${tous.length} constats\n` + tous.map((k) => `  ${k.cas} · ${k.signe} · ${k.sonde} → « ${k.question} »`).join('\n'));
    expect(tous.length).toBeLessThanOrEqual(PLAFOND);
  });

  it('les cas relus par Q4 : aucun constat hors de la liste écrite, chaque entrée de la liste sert encore', () => {
    const q4 = tous.filter((k) => CAS_Q4.includes(k.cas)).map((k) => `${k.cas}|${k.signe}|${k.sonde}`);
    expect([...new Set(q4)].filter((k) => !(k in ADMIS))).toEqual([]);
    expect(Object.keys(ADMIS).filter((k) => !q4.includes(k))).toEqual([]);
  });

  it('la lecture voit le défaut (contrôle) : une réplique qui annonce la question est relevée', () => {
    const c = structuredClone(seedCases().find((x) => x.id === 'case-polymyalgia')!);
    c.patientSheet.antworten!['akt-ort'] += ' Und seit zehn Tagen habe ich zusätzlich Kopfschmerzen.';
    expect(constats(c).map((k) => `${k.signe}|${k.sonde}`)).toContain('kopfschmerz|akt-ort');
  });
});
