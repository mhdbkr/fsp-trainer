import { PROBE_BY_ID } from './anamneseProbes';
import { parseFollowUp } from './followUp';
import { phraseFollowUps, phraseIsCaseSpecific, phraseProbes, type Phrase, type PhraseVariant } from './phrases';
import { PROFIL_EXCLUT, PROFIL_EXIGE, SIGNES, SIGNE_DEF, SUCHT_AUSSER, tagsEffectifs, type ProfilCas, type ProfilTag, type Signe } from './signes';
import { phraseSucht } from './symptoms';

// ============================================================================
// LE MOTEUR DE COHÉRENCE — lot K3 (ADR-0023, contrat `frage-atomique.md` §10.4).
// `cohere` module la trame BRUTE d'un cas (après FACH_RULES, aktuellSkip, fachSkip)
// en une passe, dans l'ordre r1 → r4a → r2 → r3 → r4b, et dit chaque écart :
//   r1  rien hors profil      (inactive sans profil ; ne retire JAMAIS une question du cas)
//   r4a une relance qui cherche un autre signe que sa mère est détachée (inconditionnelle)
//   r2  un signe, une question (gagnant : question du cas > Fach > aktuell > vegetativ > reste)
//   r3  rien d'attendu absent (la sonde de banque du signe exigé, jamais un texte inventé)
//   r4b rien avant son antécédent (`braucht`)
// Pure : aucune entrée mutée, ni hasard, ni horloge, ni E/S ; seules les tables statiques
// (lexique, PROBE_SUCHT, COHERENCE_ALLOWED) sont lues. Remplace `dedupeBySymptom` et `FACH_COVERS`.
// ============================================================================

export interface TrameChapter { id: string; questions: Phrase[] }

export type EcartAction = 'retire' | 'reduit' | 'non-reduit' | 'ajoute' | 'deplace'
  | 'detache' | 'garde-exception' | 'anomalie' | 'profil-absent';
export interface Ecart {
  regle: 0 | 1 | 2 | 3 | 4;      // 0 = profil absent
  action: EcartAction;
  question: string;              // probeId · cas:<index> · <mère>#<n> (relance)
  signes: Signe[];
  mere?: string;                 // relance de précision : la mère dont elle suit l'écart
  cause?: string;                // gagnant (r2) · tag / 'exige' (r3) · signe (r4b) · 'profil' / 'exclut' (r1)
  de?: string; vers?: string;
  sansReponse?: true;            // r3 : la fiche n'a pas de réponse pour la banque ajoutée
  raison: string;
}

/** Profil effectif (§10.3), calculé au montage : tags dérivés ∪ déclarés ; signe → ce qui l'exige / l'exclut. */
export interface ProfilEffectif {
  declare: boolean;
  tags: ProfilTag[];
  exige: Partial<Record<Signe, string>>;    // signe → tag qui l'exige, ou 'exige' (déclaré par le cas)
  exclut: Partial<Record<Signe, string>>;   // signe → tag qui l'exclut, ou la raison écrite au profil
}

export function profilEffectif(c: ProfilCas): ProfilEffectif {
  const p = c.sheet.profil;
  const tags = tagsEffectifs(c);
  const exige: Partial<Record<Signe, string>> = {};
  const exclut: Partial<Record<Signe, string>> = {};
  for (const t of tags) for (const s of PROFIL_EXIGE[t] ?? []) exige[s] ??= t;
  for (const s of p?.exige ?? []) exige[s] ??= 'exige';
  for (const t of tags) for (const s of PROFIL_EXCLUT[t] ?? []) exclut[s] ??= t;
  for (const [s, r] of Object.entries(p?.exclut ?? {})) exclut[s as Signe] ??= r ?? 'exclut';
  return { declare: !!p, tags, exige, exclut };
}

/** Exceptions nominatives (§10.6) : ajout réservé à la direction. Vide au départ ; l'exception
 *  testiculaire est la règle générique `SUCHT_AUSSER`, pas une entrée. */
export interface CoherenceException { caseId: string; question: string; signe: Signe; regle: 1 | 2; raison: string; relecteur: string }
export const COHERENCE_ALLOWED: ReadonlyArray<CoherenceException> = [];

/** La question du nom et son épellation sont la MÊME sonde posée deux fois (décision de main, K1/K2) : r2 ne les compte pas. */
export const R2_EXEMPTES: ReadonlySet<string> = new Set(['pers-name']);

/** SÉCURITÉ (décision de main, K3) : un signe de risque suicidaire ou d'automutilation n'est JAMAIS perdu. r1 ne le met
 *  jamais hors profil ; r2 s'applique normalement (le gagnant D4 reste posé, il porte le signe). L'idéation (`suizid`,
 *  `selbstverletzung_wunsch`) n'est jamais confondue avec l'acte (`selbstverletzung`) : trois signes distincts. */
export const RISIKO_SIGNES: ReadonlySet<Signe> = new Set<Signe>(['suizid', 'selbstverletzung', 'selbstverletzung_wunsch']);

export interface CohereCtx {
  antworten?: Readonly<Record<string, unknown>>;          // r3 : `sansReponse` si la banque n'a pas de réplique
  banque?: (probe: string) => Phrase | undefined;          // r3 : la phrase du guide de la sonde de banque
  allowed?: ReadonlyArray<CoherenceException>;            // défaut : COHERENCE_ALLOWED (paramètre pour les tests)
  casIndex?: (p: Phrase) => number | undefined;            // index d'une question du cas dans `caseSpecificQuestions` (id `cas:<index>`)
}

/** Rang de conservation (D4, §10.4) : question du cas 0 · Fach 1 · aktuell 2 · vegetativ 3 · autres 4. */
export const rangDe = (ch: string, cas: boolean): number => (cas ? 0 : ch === 'fach' ? 1 : ch === 'aktuell' ? 2 : ch === 'vegetativ' ? 3 : 4);

type Part = NonNullable<PhraseVariant['parts']>[number];
interface U {
  id: string; ch: string; rang: number; cas: boolean; p: Phrase;
  signes: Signe[];                    // ce que l'unité cherche (après SUCHT_AUSSER), mis à jour par r1 / r2
  parts?: number[];                   // `parts` gardées (absent = question entière)
  etat: 'garde' | 'retire' | 'nonReduit';
  rels: number[];                     // relances de PRÉCISION (index), qui suivent la mère
  enfants: U[];                       // relances qui cherchent un autre signe (unités à part, I1)
  relance?: { mere: U; i: number; cond: boolean; attachee: boolean };
}

const variant = (p: Phrase): PhraseVariant | undefined => (typeof p === 'string' ? undefined : p);
const uniq = <T,>(xs: T[]): T[] => [...new Set(xs)];
const ordreSigne = (s: Signe) => SIGNES.indexOf(s);

/** Une phrase → son unité (et ses relances hors signe, unités à part). */
function unite(p: Phrase, ch: string, k: number, tags: readonly ProfilTag[], casIndex?: (p: Phrase) => number | undefined): U {
  const v = variant(p);
  const cas = phraseIsCaseSpecific(p);
  const probes = phraseProbes(p);
  const id = v?.detacheDe ?? (cas ? `cas:${casIndex?.(p) ?? `?${ch}.${k}`}` : probes.length ? probes.join('+') : `${ch}:${k}`);
  const decl = phraseSucht(p);
  const sauf = new Set(probes.flatMap((pr) => tags.flatMap((t) => SUCHT_AUSSER[pr]?.[t] ?? [])));
  const u: U = { id, ch, rang: rangDe(ch, cas), cas, p, signes: decl.filter((s) => !sauf.has(s)), etat: 'garde', rels: [], enfants: [] };
  if (v?.detacheDe) return u;   // relance déjà détachée (passe suivante) : une question à part entière
  phraseFollowUps(p).forEach((f, i) => {
    const sucht = (f.sucht ?? []) as Signe[];
    if (!sucht.length || sucht.every((s) => decl.includes(s))) { u.rels.push(i); return; }
    const rid = `${id}#${i + 1}`;
    const phrase: PhraseVariant = { text: f.text, ...(v?.probe ? { probe: v.probe } : {}), sucht, detacheDe: rid };
    u.enfants.push({ id: rid, ch, rang: u.rang, cas: false, p: phrase, signes: sucht, etat: 'garde', rels: [], enfants: [],
      relance: { mere: u, i, cond: parseFollowUp(f.text).kind !== 'immer', attachee: true } });
  });
  return u;
}

const RAISON: Record<string, (e: Ecart) => string> = {
  '0:profil-absent': () => 'PROFIL ABSENT : contenu sans profil, r1 (hors profil) et r3 inactifs (INV-90)',
  '1:retire': (e) => `RETIRÉ ${e.question} : ${e.signes.join(', ')} — hors profil (${e.cause})`,
  '1:reduit': (e) => `RÉDUIT ${e.question} : ${e.signes.join(', ')} — hors profil (${e.cause}) ; les parts restantes sont posées`,
  '1:non-reduit': (e) => `NON RÉDUIT ${e.question} : ${e.signes.join(', ')} hors profil (${e.cause}), question sans parts (résidu)`,
  '1:garde-exception': (e) => `GARDÉ ${e.question} : ${e.signes.join(', ')} — exception COHERENCE_ALLOWED`,
  '1:anomalie': (e) => `GARDÉ ${e.question} : question du cas hors profil (${e.signes.join(', ')}) — r1 ne retire jamais une question du cas ; corriger la source (profil ou sucht)`,
  '4:detache': (e) => `DÉTACHÉ ${e.question} : ${e.signes.join(', ')} — relance hors du signe de sa mère, posée en ${e.vers}`,
  '4:anomalie': (e) => (e.cause === 'relance' ? `ANOMALIE ${e.question} : relance conditionnelle hors du signe de sa mère (DM2)`
    : e.cause === 'cycle' ? `ANOMALIE ${e.question} : braucht en cycle` : `ANOMALIE ${e.question} : « ${e.cause} » (braucht) n'est cherché nulle part`),
  '2:retire': (e) => `RETIRÉ ${e.question} : ${e.signes.join(', ')} — déjà cherché par ${e.cause}`,
  '2:reduit': (e) => `RÉDUIT ${e.question} : ${e.signes.join(', ')} déjà cherché par ${e.cause} ; les parts restantes sont posées`,
  '2:non-reduit': (e) => `NON RÉDUIT ${e.question} : ${e.signes.join(', ')} déjà cherché par ${e.cause}, question sans parts (résidu)`,
  '2:deplace': (e) => `DÉPLACÉ ${e.question} : la question du cas prend la place de ${e.cause}`,
  '2:garde-exception': (e) => `GARDÉ ${e.question} : ${e.signes.join(', ')} — exception COHERENCE_ALLOWED`,
  '2:anomalie': (e) => `DOUBLON DU CAS ${e.question} : ${e.signes.join(', ')} déjà cherché par la question du cas ${e.cause} (doublonsCas)`,
  '3:ajoute': (e) => `AJOUTÉ ${e.question} : ${e.signes.join(', ')} — exigé par « ${e.cause} »${e.sansReponse ? ' — SANS RÉPONSE dans la fiche' : ''}`,
  '4:deplace': (e) => `DÉPLACÉ ${e.question} : après la question qui cherche « ${e.cause} » (braucht)`,
};

/** Le moteur. `trame` : chapitres dans l'ordre de l'entretien, la Fach jouée sous l'id `fach`. */
export function cohere<T extends TrameChapter>(trame: readonly T[], profil: ProfilEffectif, caseId: string, ctx: CohereCtx = {}): { trame: T[]; ecarts: Ecart[] } {
  const allowed = ctx.allowed ?? COHERENCE_ALLOWED;
  const permis = (u: U, s: Signe, regle: 1 | 2) => allowed.some((a) => a.caseId === caseId && a.question === u.id && a.signe === s && a.regle === regle);
  const chapters = trame.map((ch) => ({ id: ch.id, items: ch.questions.map((p, k) => unite(p, ch.id, k, profil.tags, ctx.casIndex)) }));
  const ecarts: Ecart[] = [];
  const ecart = (e: Omit<Ecart, 'raison'>) => {
    const full = { ...e, raison: RAISON[`${e.regle}:${e.action}`](e as Ecart) } as Ecart;
    const dup = ecarts.find((x) => x.question === e.question && x.action === e.action);   // un écart par (question, action) — INV-87
    if (!dup) { ecarts.push(full); return; }
    dup.signes = uniq([...dup.signes, ...e.signes]);
    dup.raison += ` ; ${full.raison}`;
  };
  // Une relance hors signe encore attachée vit avec sa mère : si la mère est retirée, elle n'est plus posée.
  const vivants = () => chapters.flatMap((c) => c.items.flatMap((u) => [u, ...u.enfants.filter((r) => r.relance!.attachee && u.etat !== 'retire')]))
    .filter((u) => u.etat !== 'retire');
  const suivent = (u: U, base: Omit<Ecart, 'raison' | 'question' | 'mere'>) => { for (const i of u.rels) ecart({ ...base, question: `${u.id}#${i + 1}`, mere: u.id }); u.rels = []; };

  /** L'unité perd des signes : retirée si elle n'en garde aucun, réduite à ses `parts` si elles couvrent le reste, sinon non réduite. */
  const perdre = (u: U, perdus: Signe[], regle: 1 | 2, cause: string) => {
    const reste = u.signes.filter((s) => !perdus.includes(s));
    const base = { regle, signes: perdus, cause } as const;
    if (!reste.length) { u.etat = 'retire'; ecart({ ...base, action: 'retire', question: u.id }); suivent(u, { ...base, action: 'retire' }); return; }
    const parts: Part[] | undefined = variant(u.p)?.parts;
    const cur = u.parts ?? parts?.map((_, i) => i) ?? [];
    const keep = cur.filter((i) => parts![i].sucht.some((s) => reste.includes(s as Signe)));
    const couvert = reste.every((s) => keep.some((i) => parts![i].sucht.includes(s)));
    if (parts && couvert && keep.length < cur.length) {
      u.parts = keep; u.signes = reste;
      ecart({ ...base, action: 'reduit', question: u.id }); suivent(u, { ...base, action: 'reduit' });
      return;
    }
    u.etat = 'nonReduit';
    ecart({ ...base, action: 'non-reduit', question: u.id });
  };

  /** Règle d'insertion (§10.4) : dans le chapitre du signe, après la dernière question dont le premier signe le précède
   *  (ou l'égale : une relance détachée se pose après la question de son signe) ; à défaut en tête ; repli I5. */
  const inserer = (u: U, s: Signe): string => {
    const cible = SIGNE_DEF[s].kapitel;
    let ch = chapters.find((c) => c.id === cible);
    if (!ch && cible === 'frauenanamnese') ch = chapters.find((c) => c.id === 'fach' && c.items.some((v) => phraseProbes(v.p).some((p) => p.startsWith('frau-'))));
    if (!ch) {
      const akt = chapters.find((c) => c.id === 'aktuell') ?? chapters[chapters.length - 1];
      akt.items.push(u); u.ch = akt.id; return akt.id;
    }
    let at = 0;
    ch.items.forEach((v, k) => { if (v.etat !== 'retire' && v.signes.length && ordreSigne(v.signes[0]) <= ordreSigne(s)) at = k + 1; });
    ch.items.splice(at, 0, u); u.ch = ch.id;
    return ch.id;
  };

  // ── r1 — rien hors profil ───────────────────────────────────────────────────
  if (!profil.declare) ecart({ regle: 0, action: 'profil-absent', question: caseId, signes: [] });
  const hors = (s: Signe): string | undefined => {
    if (RISIKO_SIGNES.has(s)) return undefined;
    if (s in profil.exclut) return 'exclut';
    const d = SIGNE_DEF[s];
    return profil.declare && d && d.pertinence !== 'screening' && !d.pertinence.some((t) => profil.tags.includes(t)) ? 'profil' : undefined;
  };
  for (const u of vivants()) {
    const h = u.signes.filter((s) => hors(s));
    const gardes = h.filter((s) => permis(u, s, 1));
    if (gardes.length) ecart({ regle: 1, action: 'garde-exception', question: u.id, signes: gardes });
    const H = h.filter((s) => !gardes.includes(s));
    if (!H.length) continue;
    const cause = H.some((s) => hors(s) === 'exclut') ? 'exclut' : 'profil';
    if (u.cas) { ecart({ regle: 1, action: 'anomalie', question: u.id, signes: H, cause }); continue; }   // décision de main : casRetiresParR1 = 0
    perdre(u, H, 1, cause);
  }

  // ── r4a — relances hors signe ───────────────────────────────────────────────
  for (const u of vivants()) {
    if (!u.relance?.attachee) continue;
    if (u.relance.cond) { ecart({ regle: 4, action: 'anomalie', question: u.id, signes: u.signes, cause: 'relance' }); continue; }
    u.relance.attachee = false;
    const de = u.relance.mere.ch;
    ecart({ regle: 4, action: 'detache', question: u.id, signes: u.signes, de, vers: inserer(u, u.signes[0]) });
  }

  // ── r2 — un signe, une question (gagnants calculés en une fois) ─────────────
  const live = vivants().filter((u) => u.signes.length && !phraseProbes(u.p).some((p) => R2_EXEMPTES.has(p)));
  const pertes = new Map<U, Map<Signe, U>>();
  for (const s of uniq(live.flatMap((u) => u.signes))) {
    const us = live.filter((u) => u.signes.includes(s));
    if (us.length < 2) continue;
    const w = us.reduce((a, b) => (b.rang < a.rang ? b : a));
    for (const u of us) {
      if (u === w) continue;
      if (permis(u, s, 2)) { ecart({ regle: 2, action: 'garde-exception', question: u.id, signes: [s], cause: w.id }); continue; }
      if (u.cas && w.cas) ecart({ regle: 2, action: 'anomalie', question: u.id, signes: [s], cause: w.id });
      (pertes.get(u) ?? pertes.set(u, new Map()).get(u)!).set(s, w);
    }
  }
  for (const [u, m] of pertes) perdre(u, [...m.keys()], 2, uniq([...m.values()].map((w) => w.id)).join(', '));
  // Une question du cas gagnante prend la place de la première perdante du même chapitre placée au-dessus d'elle.
  for (const c of chapters) for (const w of [...c.items].filter((u) => u.cas)) {
    const at = c.items.indexOf(w);
    const k = c.items.findIndex((u, i) => i < at && [...(pertes.get(u)?.values() ?? [])].includes(w));
    if (k < 0) continue;
    c.items.splice(at, 1); c.items.splice(k, 0, w);
    ecart({ regle: 2, action: 'deplace', question: w.id, signes: w.signes, cause: c.items[k + 1].id, de: c.id, vers: c.id });
  }

  // ── r3 — rien d'attendu absent ──────────────────────────────────────────────
  if (profil.declare) for (const s of SIGNES) {
    if (!(s in profil.exige) || s in profil.exclut || vivants().some((u) => u.signes.includes(s))) continue;
    const bank = SIGNE_DEF[s].bank!;   // INV-77 : un signe exigible a une banque
    const guide = ctx.banque?.(bank) ?? { text: PROBE_BY_ID[bank]?.frage ?? bank, probe: bank };
    // La banque est l'unité du signe : sa question et ses relances de PRÉCISION. Une relance qui cherche un autre
    // signe est une autre unité, que rien n'exige : elle n'est pas ajoutée (sinon la passe suivante la détacherait).
    const u = unite(guide, SIGNE_DEF[s].kapitel, 0, profil.tags);
    if (u.enfants.length) {
      const v = variant(guide)!;
      const idx = u.rels;
      u.p = { ...v, followUp: idx.length ? idx.map((i) => v.followUp![i]) : undefined, followUpSucht: undefined };
      u.rels = idx.map((_, k) => k); u.enfants = [];
    }
    const vers = inserer(u, s);
    u.rang = rangDe(vers, false);
    ecart({ regle: 3, action: 'ajoute', question: u.id, signes: [s], cause: profil.exige[s], vers, ...(ctx.antworten?.[bank] ? {} : { sansReponse: true as const }) });
  }

  // ── r4b — rien avant son antécédent (`braucht`), jusqu'au point fixe ────────
  const braucht = (u: U) => (variant(u.p)?.braucht ?? []) as Signe[];
  const avecBraucht = () => chapters.flatMap((c) => c.items).filter((u) => u.etat !== 'retire' && braucht(u).length);
  const flat = () => chapters.flatMap((c) => c.items).filter((u) => u.etat !== 'retire');
  const viole = (u: U) => {
    const f = flat();
    const firsts = braucht(u).map((s) => f.find((v) => v !== u && v.signes.includes(s)));
    return { manque: braucht(u).filter((_, i) => !firsts[i]), apres: firsts.filter((v): v is U => !!v && f.indexOf(v) > f.indexOf(u)) };
  };
  for (const u of avecBraucht()) for (const s of viole(u).manque) ecart({ regle: 4, action: 'anomalie', question: u.id, signes: [s], cause: s });
  const n = avecBraucht().length + 1;
  for (let pass = 0; pass < n; pass++) {
    const bouges = new Set<U>();
    for (const u of avecBraucht()) {
      if (bouges.has(u)) continue;
      const { apres } = viole(u);
      if (!apres.length) continue;
      const f = flat();
      const dernier = apres.reduce((a, b) => (f.indexOf(b) > f.indexOf(a) ? b : a));
      const de = u.ch;
      const src = chapters.find((c) => c.items.includes(u))!; src.items.splice(src.items.indexOf(u), 1);
      const dst = chapters.find((c) => c.items.includes(dernier))!; dst.items.splice(dst.items.indexOf(dernier) + 1, 0, u); u.ch = dst.id;
      ecart({ regle: 4, action: 'deplace', question: u.id, signes: u.signes, cause: braucht(u).filter((s) => dernier.signes.includes(s)).join(', '), de, vers: dst.id });
      bouges.add(u);
    }
    if (!bouges.size) break;
  }
  for (const u of avecBraucht()) if (viole(u).apres.length) ecart({ regle: 4, action: 'anomalie', question: u.id, signes: braucht(u), cause: 'cycle' });

  // ── La trame jouée ──────────────────────────────────────────────────────────
  const poser = (u: U): Phrase[] => {
    if (u.etat === 'retire') return [];
    const v = variant(u.p);
    if (!v || u.relance) return [u.p];
    if (u.parts) return u.parts.map((i) => {
      const pt = v.parts![i];
      return { ...v, text: pt.text, alts: undefined, followUp: pt.followUp?.length ? pt.followUp : undefined, parts: undefined, enumere: undefined,
        followUpSucht: pt.followUpSucht?.length ? pt.followUpSucht : undefined, sucht: pt.sucht.filter((s) => u.signes.includes(s as Signe)) };
    });
    // Les relances hors signe parties : détachées (r4a) ou retirées pour leur propre compte (r1, r2).
    const parties = u.enfants.filter((r) => !r.relance!.attachee || r.etat === 'retire').map((r) => r.relance!.i);
    if (!parties.length) return [u.p];
    const idx = (v.followUp ?? []).map((_, i) => i).filter((i) => !parties.includes(i));
    const fu = idx.map((i) => v.followUp![i]);
    const fs = idx.map((i) => v.followUpSucht?.[i] ?? []);
    return [{ ...v, followUp: fu.length ? fu : undefined, followUpSucht: fs.some((x) => x.length) ? fs : undefined }];
  };
  return { trame: trame.map((ch, k) => ({ ...ch, questions: chapters[k].items.flatMap(poser) })), ecarts };
}

// ── Les compteurs de la porte, APRÈS montage (§10.6) ──────────────────────────
export interface CompteursApres {
  doublons: number; horsProfil: number; exigeAbsent: number; relancesOrphelines: number; brauchtViole: number; ajouteSansReponse: number;
  nonReduit: number; casRetiresParR1: number;
}
/** Relit la trame JOUÉE (pas l'état interne de `cohere`) : un signe cherché par ≥ 2 unités, hors exceptions et hors questions
 *  non réduites ; un signe hors profil encore cherché, hors non réduites, exceptions et questions du cas gardées par r1 ; etc. */
export function compteursApres(trame: readonly TrameChapter[], profil: ProfilEffectif, ecarts: readonly Ecart[], casIndex?: CohereCtx['casIndex']): CompteursApres & { detail: string[] } {
  const units = trame.flatMap((ch) => ch.questions.map((p, k) => unite(p, ch.id, k, profil.tags, casIndex)))
    .flatMap((u) => [u, ...u.enfants]).filter((u) => !phraseProbes(u.p).some((p) => R2_EXEMPTES.has(p)));
  const nonReduit = new Set(ecarts.filter((e) => e.action === 'non-reduit').map((e) => e.question));
  const exception = new Set(ecarts.filter((e) => e.action === 'garde-exception').flatMap((e) => e.signes.map((s) => `${e.question}|${s}`)));
  const casGardes = new Set(ecarts.filter((e) => e.regle === 1 && e.action === 'anomalie').map((e) => e.question));
  const compte = (u: U, s: Signe) => !nonReduit.has(u.id) && !exception.has(`${u.id}|${s}`);
  const detail: string[] = [];
  let doublons = 0;
  for (const s of uniq(units.flatMap((u) => u.signes))) {
    const us = units.filter((u) => u.signes.includes(s) && compte(u, s));
    if (us.length > 1) { doublons++; detail.push(`doublon « ${s} » : ${us.map((u) => u.id).join(' | ')}`); }
  }
  let horsProfil = 0;
  for (const u of units) for (const s of u.signes) {
    const d = SIGNE_DEF[s];
    const h = !RISIKO_SIGNES.has(s) && (s in profil.exclut || (profil.declare && d && d.pertinence !== 'screening' && !d.pertinence.some((t) => profil.tags.includes(t))));
    if (h && compte(u, s) && !casGardes.has(u.id)) { horsProfil++; detail.push(`hors profil « ${s} » : ${u.id}`); }
  }
  const cherches = new Set(units.flatMap((u) => u.signes));
  const absents = profil.declare ? (Object.keys(profil.exige) as Signe[]).filter((s) => !(s in profil.exclut) && !cherches.has(s)) : [];
  for (const s of absents) detail.push(`exigé absent « ${s} »`);
  const flat = units.filter((u) => !u.relance);
  const avant = flat.filter((u) => ((variant(u.p)?.braucht ?? []) as Signe[]).some((s) => {
    const k = flat.findIndex((v) => v !== u && v.signes.includes(s));
    return k > flat.indexOf(u);   // cherché nulle part = anomalie r4b, déjà comptée
  })).length;
  return {
    doublons, horsProfil, exigeAbsent: absents.length,
    relancesOrphelines: ecarts.filter((e) => e.regle === 4 && e.action === 'anomalie' && e.cause === 'relance').length,
    brauchtViole: ecarts.filter((e) => e.regle === 4 && e.action === 'anomalie' && e.cause !== 'relance').length + avant,
    ajouteSansReponse: ecarts.filter((e) => e.sansReponse).length,
    nonReduit: nonReduit.size,
    casRetiresParR1: ecarts.filter((e) => e.regle === 1 && e.action === 'retire' && e.question.startsWith('cas:')).length,
    detail,
  };
}
