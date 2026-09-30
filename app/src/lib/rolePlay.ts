import type { CaseQuestion, PatientSheet, RolePlayKapitel } from '@/db/types';
import { cqKapitel, cqText } from '@/lib/caseQuestions';
import { PROBE_BY_ID, PROBE_ORDER } from '@/data/guides/anamneseProbes';
import { PROBE_SUCHT, type Symptom } from '@/data/guides/symptoms';

// ============================================================================
// Rollenskript — transforme la fiche patient en SCRIPT DE JEU structuré par
// les mêmes chapitres que le guide d'anamnèse du candidat. Le partenaire est
// toujours à un tap de la bonne réponse, même si les questions arrivent dans
// le désordre. Les répliques (frageAntworten) et les négatifs sont classés
// automatiquement par mots-clés ; `kapitel` sur une entrée force le chapitre.
// ============================================================================

export interface RoleLine {
  frage?: string;      // question probable du candidat (repère, affiché discret)
  antwort: string;     // réplique en Ich-Form, prête à dire
  negativ?: boolean;   // signe nié → chip « ✗ Nein »
  probeId?: string;    // sonde d'origine — permet au suivi live de viser LA ligne
  improvise?: boolean; // question propre au cas : pas de réplique écrite, le simulant répond depuis la fiche
}

export interface RoleChapter {
  id: RolePlayKapitel;
  title: string;       // titre allemand (aligné sur le guide du candidat)
  icon: string;
  glance: string[];    // « coup d'œil » : les faits bruts du chapitre
  lines: RoleLine[];   // répliques jouables
}

const CHAPTER_META: { id: RolePlayKapitel; title: string; icon: string }[] = [
  { id: 'personalia', title: 'Persönliche Daten', icon: 'id' },
  { id: 'aktuell', title: 'Aktuelle Beschwerden', icon: 'pain' },
  { id: 'fach', title: 'Fachanamnese', icon: 'stethoscope' },
  { id: 'vegetativ', title: 'Vegetative Anamnese', icon: 'pulse' },
  { id: 'vorerkrankungen', title: 'Vorerkrankungen & OPs', icon: 'history' },
  { id: 'medikamente', title: 'Medikamente', icon: 'pill' },
  { id: 'allergien', title: 'Allergien', icon: 'allergy' },
  { id: 'noxen', title: 'Noxen', icon: 'cigarette' },
  { id: 'familie-sozial', title: 'Familie & Soziales', icon: 'family' },
  { id: 'frauenanamnese', title: 'Frauenanamnese', icon: 'female' },
];

// Classification par mots-clés — l'ORDRE des règles compte (spécifique → général).
const RULES: { kapitel: RolePlayKapitel; re: RegExp }[] = [
  { kapitel: 'frauenanamnese', re: /schwanger|periode|regelblutung|monatsblutung|verhütung|wechseljahre/i },
  { kapitel: 'noxen', re: /rauch|zigarette|alkohol|trinken sie|drogen|cannabis|bier|schnaps|wein|packungsjahr/i },
  { kapitel: 'allergien', re: /allerg|unverträglich/i },
  { kapitel: 'medikamente', re: /medikament|blutverdünner|kortison|tablette|aspirin|genommen|marcumar/i },
  { kapitel: 'familie-sozial', re: /familie|verheiratet|kinder|wohnen|eltern|vater|mutter|bruder|schwester|geschwister|allein|beruf|arbeiten sie|rente|haustier/i },
  { kapitel: 'vorerkrankungen', re: /vorerkrank|chronisch|erkrankung|krankheit|operiert|operation|krankenhaus|zuckerkrank|bluthochdruck|gallensteine|spiegelung|darmspiegelung|leistenbruch/i },
  { kapitel: 'personalia', re: /heißen|buchstabier|geboren|alt sind|wie groß|wiegen|hausarzt/i },
  { kapitel: 'vegetativ', re: /fieber|schüttelfrost|nachtschweiß|gewicht|appetit|übel|erbroch|erbrechen|stuhl|urin|wasserlassen|schlaf|winde|durst/i },
];

export function classifyLine(text: string): RolePlayKapitel {
  for (const r of RULES) if (r.re.test(text)) return r.kapitel;
  return 'aktuell'; // motif, douleur OPQRST, symptômes associés — le défaut
}

// --- Coup d'œil : les faits bruts du chapitre, depuis les champs structurés --
function glanceFor(id: RolePlayKapitel, s: PatientSheet): string[] {
  const p = s.personalia;
  switch (id) {
    case 'personalia':
      return [
        `${p.name}, ${p.age} Jahre`,
        [p.groesseCm && `${p.groesseCm} cm`, p.gewichtKg && `${p.gewichtKg} kg`].filter(Boolean).join(' · '),
        p.beruf ?? '', p.hausarzt ? `Hausarzt: ${p.hausarzt}` : '',
      ].filter(Boolean);
    case 'aktuell': {
      const sm = s.schmerz;
      const pain = sm ? [sm.ort && `Wo: ${sm.ort}`, sm.charakter && `Wie: ${sm.charakter}`, sm.intensitaet && `${sm.intensitaet}/10`, sm.ausstrahlung && `→ ${sm.ausstrahlung}`, sm.beginn && `Seit: ${sm.beginn}`].filter(Boolean).join(' · ') : '';
      return [...s.leitsymptome, pain, ...s.begleitsymptome].filter(Boolean);
    }
    case 'vegetativ': return s.vegetativeAnamnese;
    case 'vorerkrankungen': return [...s.vorerkrankungen, ...s.voroperationen.filter((o) => o.toLowerCase() !== 'keine').map((o) => `OP: ${o}`)];
    case 'medikamente': return s.medikamente;
    case 'allergien': return [...s.allergien, ...(s.unvertraeglichkeiten ?? [])];
    case 'noxen': return [s.noxen.tabak && `Tabak: ${s.noxen.tabak}`, s.noxen.alkohol && `Alkohol: ${s.noxen.alkohol}`, s.noxen.drogen && `Drogen: ${s.noxen.drogen}`].filter(Boolean) as string[];
    case 'familie-sozial': return [...s.familienanamnese, ...s.sozialanamnese];
    default: return [];
  }
}

/** Construit le Rollenskript complet (chapitres dans l'ordre du guide).
 *  Source primaire = `antworten` (carte probeId → réplique) : chaque réponse est
 *  reliée à sa sonde canonique (question + chapitre + ordre d'entretien), donc
 *  la couverture suit le guide sans dérive. `frageAntworten` (ad-hoc) et
 *  `negativeFindings` sont ajoutés ensuite pour rétrocompatibilité.
 *  `played` (playedQuestionsByProbe) : la question telle que le guide la pose
 *  pour CE cas ; une sonde qu'il ne pose pas (âge, doublon) garde sa réplique
 *  sans question. */
export function buildRollenskript(sheet: PatientSheet, caseQuestions: CaseQuestion[] = [], played?: Map<string, string>): RoleChapter[] {
  const byId = new Map<RolePlayKapitel, (RoleLine & { ord: number })[]>();
  for (const meta of CHAPTER_META) byId.set(meta.id, []);

  // Une question du cas qui cherche un symptôme (`sucht`) remplace la sonde
  // générale dans la trame : la réplique de la sonde la suit.
  const takenOver = new Map<CaseQuestion, string[]>();
  // Ordre de l'entretien : celui de la trame jouée ; une réplique sans question en fin de chapitre.
  const playedRank = new Map([...(played?.keys() ?? [])].map((id, i) => [id, i]));
  const takerOf = (probeId: string) => caseQuestions.find((q) => typeof q !== 'string' && q.sucht?.some((s) => PROBE_SUCHT[probeId]?.includes(s as Symptom)));

  // 1) Réponses aux sondes canoniques (pilotées par la checklist du guide).
  for (const [probeId, antwort] of Object.entries(sheet.antworten ?? {})) {
    if (!antwort) continue;
    const probe = PROBE_BY_ID[probeId];
    // Sonde que le guide ne pose pas pour ce cas : la réplique reste (fidélité,
    // ADR D7), sans la question — ou suit la question du cas qui la remplace.
    const asked = !probe || !played || played.has(probeId);
    const q = asked ? undefined : takerOf(probeId);
    if (q) { takenOver.set(q, [...(takenOver.get(q) ?? []), antwort]); continue; }
    if (probe) byId.get(probe.kapitel)!.push({ ...(asked ? { frage: played?.get(probeId) ?? probe.frage } : {}), antwort, probeId, ord: playedRank.get(probeId) ?? (played ? 900 + (PROBE_ORDER[probeId] ?? 99) / 1000 : PROBE_ORDER[probeId] ?? 999) });
    else byId.get(classifyLine(antwort))!.push({ antwort, ord: 999 }); // id inconnu : on n'écarte pas le contenu
  }
  // 2) Répliques ad-hoc éventuelles (hors checklist) — placées après les sondes.
  for (const qa of sheet.frageAntworten ?? []) {
    const k = qa.kapitel ?? classifyLine(qa.frage);
    byId.get(k)!.push({ frage: qa.frage, antwort: qa.antwort, ord: 1000 });
  }
  // 3) Négatifs de dépistage restants (chips « ✗ »).
  for (const neg of sheet.negativeFindings ?? []) {
    const k = classifyLine(neg);
    byId.get(k)!.push({ antwort: neg, negativ: true, ord: 1001 });
  }

  // 4) Questions propres au cas (FB2-J8) : le candidat va les poser, le
  //    simulant doit au moins les VOIR dans son chapitre. La réplique
  //    s'improvise depuis le « coup d'œil » juste au-dessus — sauf si elle a
  //    repris la réplique d'une sonde qu'elle remplace.
  for (const q of caseQuestions) {
    const k = cqKapitel(q);
    const antwort = [...new Set(takenOver.get(q) ?? [])].join(' ');
    byId.get(k === 'fach' ? 'fach' : (k as RolePlayKapitel))?.push({ frage: cqText(q), antwort, ...(antwort ? {} : { improvise: true }), ord: 1002 });
  }

  return CHAPTER_META
    .map((m) => {
      const lines = byId.get(m.id)!.sort((a, b) => a.ord - b.ord).map(({ ord: _ord, ...l }) => l);
      return { ...m, glance: glanceFor(m.id, sheet), lines };
    })
    .filter((ch) => ch.lines.length > 0 || ch.glance.length > 0);
}

/** Mappe le chapitre actif du guide candidat → chapitre du Rollenskript
 *  (suivi live sur le 2ᵉ écran). `null` = pas de saut. */
export function guideToRoleKapitel(guideChapterId: string): RolePlayKapitel | null {
  if (guideChapterId.startsWith('fach-')) return 'fach';
  if (guideChapterId === 'eroeffnung') return 'personalia';
  if (guideChapterId === 'abschluss') return null;
  const known = CHAPTER_META.find((m) => m.id === guideChapterId);
  return known ? known.id : null;
}
