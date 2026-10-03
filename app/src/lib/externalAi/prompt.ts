// ============================================================================
// Le texte que le candidat colle dans une IA externe (contrat
// docs/contracts/ai-bridge.md §2). Deux temps, allemand seul, UN rôle :
//   - anrede : l'amorce (≤ ANREDE_MAX) — rôle, cadre, ouverture, UNE
//     instruction de sortie ;
//   - akte   : la fiche, repliée sous « # Deine Akte » (aucune des deux
//     cibles n'accepte un second message par lien).
// Le Teil d'où le lanceur est ouvert choisit le rôle :
//   anamnese        → patient. Faits du patient SEULEMENT (patientSheet) :
//                     rien de medicalView, ni négatifs (ils portent la
//                     justification différentielle), ni persona française.
//   fallvorstellung → Oberarzt seul. Faits structurés du cas (identité,
//                     antécédents, traitements, allergies, noxes), diagnostic,
//                     différentiels, Leitbefunde, questions dans l'ordre — sans
//                     le script du patient ni les réponses attendues (taille).
// Bornes (prompt.corpus.test.ts) : texte collé ≤ PASTE_MAX, parce que
// ChatGPT convertit un collage de plus de 10 000 caractères en pièce jointe
// (notes de version du 22 juin 2026, app/docs/reports/lead-s3-ia-sources.md §3).
// ============================================================================
import type { Case } from '@/db/types';
import { buildRollenskript } from '@/lib/rolePlay';

export type AnkerTeil = 'anamnese' | 'fallvorstellung';
export type RolleModus = 'patient' | 'oberarzt';

export interface PromptPaket {
  anrede: string;
  akte: string;
  modus: RolleModus;
  caseId: string;
}

export const ANREDE_MAX = 900;
/** Au-delà, ChatGPT range le collage en pièce jointe (sources §3). */
export const PASTE_MAX = 10_000;
/** La seule instruction de sortie de chaque rôle (contrat A3, littéral). */
export const AUSGABE: Record<RolleModus, string> = {
  patient: 'Antworte ausschließlich mit deiner ersten Patientenäußerung.',
  oberarzt: 'Antworte ausschließlich mit deiner ersten Frage als Oberarzt.',
};
/** Dernière ligne du texte patient : le candidat y écrit sa salutation —
 *  c'est lui qui ouvre l'entretien, jamais l'IA. */
export const BEGRUESSUNG = 'Meine Begrüßung:';

const AKTE_HEADER = '# Deine Akte';

// Justification différentielle glissée dans une réplique : « (spricht gegen X) »,
// « (gegen X) », « (keine Hinweise auf X) ». Un patient ne la connaît pas.
const RATIONALE_RE = /\s*\((?:(?:spricht |eher )?gegen |keine? Hinweise? auf )[^)]*\)/gu;
const clean = (s: string) => s.replace(RATIONALE_RE, '').trim();

// Une réplique qui ne fait que nier (« Nein, Fieber hatte ich nicht. ») est
// couverte par la règle de l'amorce : ce qui n'est pas dans l'Akte, le patient
// ne l'a pas. Une négation qui porte une nuance (« nur », « seit », un
// chiffre…) reste : c'est un fait.
const VERNEINUNG_RE = /^(?:Nein|Nee|Kein\w*|Nicht|Nie|Noch nie)\b/i;
const NUANCE_RE = /\b(?:aber|nur|außer|bis auf|seit|früher|damals|mal|manchmal|ab und zu|eigentlich|sondern|doch)\b|\d/i;
const reineVerneinung = (s: string) => VERNEINUNG_RE.test(s) && !NUANCE_RE.test(s);

const bullets = (items: string[]) => items.map((x) => `- ${x}`).join('\n');

function patient(c: Case): PromptPaket {
  const s = c.patientSheet;
  const p = s.personalia;
  const rolle = p.geschlecht === 'w' ? 'die Patientin' : p.geschlecht === 'm' ? 'der Patient' : 'die Patientin oder der Patient';
  const anrede = [
    `Du bist ${p.name}, ${p.age} Jahre alt${p.beruf ? `, ${p.beruf}` : ''}. Wir spielen eine Simulation der Fachsprachprüfung Medizin in Deutschland: Ich bin die Ärztin oder der Arzt und führe mit dir das Anamnesegespräch, du bist ${rolle}.`,
    '',
    'So spielst du:',
    '- Du antwortest nur auf meine Frage, in ein bis zwei Sätzen, in Alltagssprache, ohne Fachbegriffe.',
    '- Deine Fakten stehen in deiner Akte. Was dort nicht steht, hast und hattest du nicht: keine weiteren Beschwerden, Krankheiten, Medikamente oder Allergien. Was du nicht weißt, sagst du so.',
    '- Du kennst keine Diagnose und vermutest keine.',
    '- Du bleibst in deiner Rolle, bis ich „Ende“ sage.',
    '',
    'Meine Begrüßung steht am Ende dieser Nachricht.',
    AUSGABE.patient,
  ].join('\n');

  const chapters = buildRollenskript(s).map((ch) => {
    const all = ch.lines.filter((l) => !l.negativ && l.antwort).map((l) => clean(l.antwort));
    const lines = all.filter((a) => !reineVerneinung(a));
    // Sans réplique écrite, le « coup d'œil » du chapitre tient lieu de fait —
    // jamais pour `aktuell`, dont le coup d'œil est médical.
    const facts = lines.length ? lines : all.length || ch.id === 'aktuell' ? [] : ch.glance.map(clean);
    return facts.length ? `## ${ch.title}\n${bullets(facts)}` : null;
  });
  const schwierig = s.schwierigeReaktionen?.length ? `## Wenn es schwierig wird\n${bullets(s.schwierigeReaktionen.map(clean))}` : null;
  const akte = [...chapters, schwierig].filter(Boolean).join('\n');
  return { anrede, akte, modus: 'patient', caseId: c.id };
}

function oberarzt(c: Case): PromptPaket {
  const fach = c.fachanamnese ?? c.specialty;
  const anrede = [
    `Du bist Oberärztin oder Oberarzt (${fach}). Wir spielen eine Simulation der Fachsprachprüfung Medizin in Deutschland, Teil 3: Ich bin Assistenzärztin oder Assistenzarzt, habe den Fall gerade aufgenommen und stelle ihn dir vor.`,
    '',
    'So spielst du:',
    '- Du eröffnest mit der Bitte um die Vorstellung und hörst zu, bis ich fertig bin.',
    '- Danach stellst du die übrigen Fragen aus deiner Akte, eine nach der anderen, in Fachsprache, und wartest jede Antwort ab.',
    '- Fordernd, aber wohlwollend: Du hilfst nicht ungefragt und verrätst keine Lösung.',
    '- Du bleibst in deiner Rolle, bis ich „Ende“ sage.',
    '',
    AUSGABE.oberarzt,
  ].join('\n');

  const mv = c.medicalView;
  const s = c.patientSheet;
  const p = s.personalia;
  const list = (label: string, xs: (string | undefined | false)[]) => {
    const v = xs.filter((x): x is string => !!x && x.trim().toLowerCase() !== 'keine');
    return v.length ? `${label}: ${v.join('; ')}` : null;
  };
  // Les faits structurés de la fiche — de quoi vérifier la présentation, sans
  // aucune réplique du patient (O1).
  const fall = [
    [`${p.name}, ${p.age} Jahre`, p.geschlecht === 'w' ? 'weiblich' : p.geschlecht === 'm' ? 'männlich' : null, p.beruf].filter(Boolean).join(', '),
    list('Vorerkrankungen', s.vorerkrankungen),
    list('Voroperationen', s.voroperationen),
    list('Medikamente', s.medikamente),
    list('Allergien und Unverträglichkeiten', [...s.allergien, ...(s.unvertraeglichkeiten ?? [])]),
    list('Noxen', [s.noxen.tabak && `Tabak: ${s.noxen.tabak}`, s.noxen.alkohol && `Alkohol: ${s.noxen.alkohol}`, s.noxen.drogen && `Drogen: ${s.noxen.drogen}`]),
  ].filter((x): x is string => !!x);
  const sheetQuestions = (c.examinerSheet ?? []).flatMap((sec) => sec.interactions.map((i) => i.frage.trim()));
  const fragen = sheetQuestions.length ? sheetQuestions : c.examinerQuestions ?? [];
  const akte = [
    `## Der Fall\n${bullets(fall)}`,
    `## Diagnose\n${mv.verdachtsdiagnose}`,
    mv.differenzialdiagnosen.length ? `## Differenzialdiagnosen\n${bullets(mv.differenzialdiagnosen.map((d) => d.dd))}` : null,
    `## Leitbefunde\n${bullets([...c.patientSheet.leitsymptome, ...c.patientSheet.begleitsymptome])}`,
    fragen.length ? `## Deine Fragen, in dieser Reihenfolge\n${bullets(fragen)}` : null,
  ].filter(Boolean).join('\n');
  return { anrede, akte, modus: 'oberarzt', caseId: c.id };
}

export function buildPromptPaket(c: Case, teil: AnkerTeil): PromptPaket {
  return teil === 'fallvorstellung' ? oberarzt(c) : patient(c);
}

/** Le texte collé en un seul message : amorce, akte repliée, et — en mode
 *  patient — la ligne où le candidat écrit sa salutation. */
export function promptText(p: PromptPaket): string {
  const tail = p.modus === 'patient' ? `\n\n${BEGRUESSUNG} ` : '';
  return `${p.anrede}\n\n${AKTE_HEADER}\n${p.akte}${tail}`;
}
