import { describe, it, expect } from 'vitest';
import { buildPromptPaket, promptText, AUSGABE, ANREDE_MAX, PASTE_MAX, type AnkerTeil } from './prompt';
import { seedCases } from '@/data/seedCases';
import type { Case } from '@/db/types';

// Contrat ai-bridge §7 sur les 130 cas : INV-30 (amorce), INV-31 (non-fuite),
// INV-32 (bornes O2/O3), INV-36 (aucun français). PASTE_MAX (10 000, seuil de
// pièce jointe ChatGPT) est plus strict que O3 : tenu par un cliquet.

const OBERARZT_MAX = 8000; // O2
const PATIENT_MAX = 12_000; // O3
// Cliquet : les seuls cas dont le texte patient dépasse encore PASTE_MAX
// (ChatGPT le range alors en pièce jointe). Leurs répliques sont les plus
// longues du corpus ; les raccourcir relève du pôle Contenu. Un cas qui
// s'ajoute à la liste fait échouer le test ; un cas qui en sort aussi, pour
// que la liste reste vraie.
const OVER_PASTE_MAX = ['case-delir', 'case-karpaltunnel', 'case-metabolisches-syndrom', 'case-pankreaskarzinom', 'case-ulcus-cruris'];
const TEILE: AnkerTeil[] = ['anamnese', 'fallvorstellung'];

// A4 : aucune demande d'évaluation dans l'amorce.
const EVALUATION_RE = /Feedback|bewerte|Bewertung|Korrektur|Fehler|\bNote\b/;
// Justification différentielle ou attendu d'examinateur : inférence du diagnostic.
const INFERENCE_RE = /\((?:spricht |eher )?gegen |\(keine? Hinweise? auf |\(erwartet|Erwartet wird/;
// INV-36 : une phrase est française si elle porte une expression forte, ou au
// moins deux mots-outils français distincts (aucun n'est un mot allemand).
const FR_STRONG = /\b(le simulant|le candidat|tu es|si le|si la|ne \w+ pas)\b/i;
const FR_WEAK = /\b(le|la|les|une|pour|avec|sans|est|vous|nous|dans|pas|sur|qui|que|ton|tes)\b/gi;
const frenchSentences = (text: string) => text.split(/(?<=[.!?])\s+|\n/u).filter((s) => {
  if (FR_STRONG.test(s)) return true;
  return new Set([...s.matchAll(FR_WEAK)].map((m) => m[1].toLowerCase())).size >= 2;
});

/** La tête du diagnostic retenu, avant ses précisions (« Akute Lungenembolie rechts »). */
const diagnoseKopf = (c: Case) => c.medicalView.verdachtsdiagnose.split(/ bei | — | – |;|,|\(/)[0].trim();

function strings(v: unknown, min = 12, out: string[] = []): string[] {
  if (typeof v === 'string') { if (v.length >= min) out.push(v); }
  else if (Array.isArray(v)) v.forEach((x) => strings(x, min, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, min, out));
  return out;
}

const stats = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return `min=${s[0]} médiane=${s[Math.floor(s.length / 2)]} p90=${s[Math.floor(s.length * 0.9)]} max=${s[s.length - 1]}`;
};

describe('prompt externe sur le corpus (130 cas × 2 Teile)', () => {
  const cases = seedCases();

  it('amorce, rôle unique, bornes, aucune fuite, aucun français', () => {
    expect(cases.length).toBeGreaterThanOrEqual(130);
    const fail: string[] = [];
    const len: Record<AnkerTeil, number[]> = { anamnese: [], fallvorstellung: [] };
    const anredeLen: number[] = [];
    const patientOwnWords: string[] = [];
    const overPaste: string[] = [];

    for (const c of cases) {
      for (const teil of TEILE) {
        const p = buildPromptPaket(c, teil);
        const full = promptText(p);
        const id = `${c.id}/${teil}`;
        len[teil].push(full.length);
        anredeLen.push(p.anrede.length);

        // INV-30
        if (p.anrede.length > ANREDE_MAX) fail.push(`${id} A1 ${p.anrede.length}`);
        if (p.anrede.split(AUSGABE[p.modus]).length !== 2 || full.split('Antworte ausschließlich').length !== 2) fail.push(`${id} A3`);
        if (EVALUATION_RE.test(p.anrede)) fail.push(`${id} A4`);
        if (p.modus === 'patient' && /Oberarzt|Oberärztin/.test(p.anrede)) fail.push(`${id} A5`);
        if (p.modus === 'oberarzt' && /Patient/.test(p.anrede)) fail.push(`${id} A5`);
        if (/warte[^.]*\.\s*Dann/.test(p.anrede)) fail.push(`${id} A6`);
        // INV-32
        if (full.length > PASTE_MAX) overPaste.push(c.id);
        if (p.modus === 'patient' && full.length > PATIENT_MAX) fail.push(`${id} O3 ${full.length}`);
        if (p.modus === 'oberarzt' && full.length > OBERARZT_MAX) fail.push(`${id} O2 ${full.length}`);
        // INV-36
        for (const s of frenchSentences(full)) fail.push(`${id} FR « ${s.slice(0, 80)} »`);

        if (p.modus === 'patient') {
          // INV-31 — D1 : le diagnostic retenu n'apparaît jamais.
          const kopf = diagnoseKopf(c);
          if (full.toLowerCase().includes(kopf.toLowerCase())) fail.push(`${id} D1 « ${kopf} »`);
          // Aucun texte de la fiche médicale qui ne soit pas aussi dans la fiche patient.
          const ps = strings(c.patientSheet);
          for (const ms of strings(c.medicalView)) {
            if (full.includes(ms) && !ps.some((x) => x.includes(ms))) fail.push(`${id} D1 medicalView « ${ms.slice(0, 60)} »`);
          }
          // D2 + inférence : aucune justification différentielle, aucun attendu.
          if (INFERENCE_RE.test(full)) fail.push(`${id} D2 ${full.match(INFERENCE_RE)![0]}`);
          // L'amorce (le gabarit) ne nomme jamais la pathologie.
          if (p.anrede.toLowerCase().includes(c.pathology.toLowerCase())) fail.push(`${id} D1 pathologie dans l'amorce`);
          // Relevé (non bloquant) : la pathologie dite par le patient lui-même,
          // dans ses propres répliques (antécédent connu, famille).
          if (full.toLowerCase().includes(c.pathology.toLowerCase())) patientOwnWords.push(c.id);
        } else {
          // O1 : aucune réplique du patient, aucun négatif.
          for (const a of Object.values(c.patientSheet.antworten ?? {})) if (a && a.length >= 20 && p.akte.includes(a)) fail.push(`${id} O1 réplique`);
          for (const n of c.patientSheet.negativeFindings ?? []) if (n.length >= 12 && p.akte.includes(n)) fail.push(`${id} O1 négatif`);
          if (!p.akte.includes(c.medicalView.verdachtsdiagnose)) fail.push(`${id} diagnostic absent`);
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `[prompt externe] amorce ${stats(anredeLen)}\n` +
      `[prompt externe] patient (Anamnese) ${stats(len.anamnese)}\n` +
      `[prompt externe] oberarzt (Fallvorstellung) ${stats(len.fallvorstellung)}\n` +
      `[prompt externe] > PASTE_MAX : ${overPaste.length}/${cases.length * 2}\n` +
      `[prompt externe] pathologie dite par le patient lui-même : ${patientOwnWords.length} cas ${patientOwnWords.join(', ')}`,
    );
    expect(fail).toEqual([]);
    expect([...new Set(overPaste)].sort()).toEqual(OVER_PASTE_MAX);
  });
});
