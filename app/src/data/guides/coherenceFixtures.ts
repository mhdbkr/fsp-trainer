import { seedCases } from '@/data/seedCases';
import type { Case } from '@/db/types';
import { playedTrame } from './anamneseChapters';
import { cohere, profilEffectif, type CohereCtx, type Ecart, type ProfilEffectif, type TrameChapter } from './coherence';
import { phraseFollowUps, phraseIsCaseSpecific, phraseProbes, type Phrase, type PhraseVariant } from './phrases';
import { phraseSucht, type ProfilTag, type Signe } from './symptoms';

// Fixtures partagées des tests du moteur de cohérence (K3) : sondes réelles, textes de fixture.
export const cases = seedCases();
export const byId = (id: string) => cases.find((c) => c.id === id)!;

// ── fixtures ─────────────────────────────────────────────────────────────────
export const CAS = new WeakMap<object, number>();
export const ctx: CohereCtx = { casIndex: (p) => (typeof p === 'string' ? undefined : CAS.get(p)) };
export const s = (probe: string, more: Partial<PhraseVariant> = {}): PhraseVariant => ({ text: probe, probe, ...more });
export const cas = (i: number, text: string, sucht?: string[], more: Partial<PhraseVariant> = {}): PhraseVariant => {
  const p: PhraseVariant = { text, caseSpecific: true, ...(sucht ? { sucht } : {}), ...more };
  CAS.set(p, i);
  return p;
};
export const ch = (id: string, ...questions: Phrase[]): TrameChapter => ({ id, questions });
export const prof = (kategorie: ProfilTag & string, tags: ProfilTag[], extra: { exige?: Signe[]; exclut?: Partial<Record<Signe, string>> } = {}): ProfilEffectif =>
  profilEffectif({ id: 'fx', kategorie: kategorie as never, sheet: { profil: { tags: tags as [ProfilTag, ...ProfilTag[]], ...extra } } });
export const PSY = prof('psychisch', ['psychisch']);   // aucun signe exigé : r3 se tait
export const cle = (p: Phrase): string => {
  if (typeof p !== 'string' && p.detacheDe) return `^${p.detacheDe}`;
  if (phraseIsCaseSpecific(p)) return 'cas';
  return (phraseProbes(p).join('+') || '·') + (typeof p !== 'string' && p.sucht ? `~${p.sucht.join(',')}` : '');   // ~ = réduite par `parts`
};
export const vue = (t: TrameChapter[]) => Object.fromEntries(t.map((c) => [c.id, c.questions.map(cle)]));
export const run = (t: TrameChapter[], p: ProfilEffectif = PSY, more: CohereCtx = {}) => cohere(t, p, 'fx', { ...ctx, ...more });
export const un = (e: Ecart[], q: string, action: string) => e.find((x) => x.question === q && x.action === action);
export const coeur = (c: Case) => {
  const t = playedTrame(c);
  const out: Record<string, string[]> = {};
  for (const x of t.chapters) {
    if (x.id === 'aktuell' || x.id === 'vegetativ') out[x.id] = x.questions.map(cle);
    if (x.id === 'aktuell' && t.fach) out.fach = t.fach.chapter.questions.map(cle);
  }
  return out;
};
export const trameJouee = (c: Case): TrameChapter[] => {
  const t = playedTrame(c);
  return t.chapters.flatMap((x) => (x.id === 'aktuell' && t.fach ? [x, { ...t.fach.chapter, id: 'fach' }] : [x]));
};
export const signesJoues = (t: TrameChapter[]) => new Set(t.flatMap((x) => x.questions.flatMap((p) => [...phraseSucht(p), ...phraseFollowUps(p).flatMap((f) => f.sucht ?? [])])));

