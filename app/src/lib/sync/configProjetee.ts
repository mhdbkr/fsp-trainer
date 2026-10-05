// ============================================================================
// La configuration du programme, SYNCHRONISÉE — et les refus.
// Contrat : docs/contracts/training-journal.md §12.10 · INV-68, INV-76 · ADR-0021 (I2, N2).
//
// Avant la série 4, `program.configured` partait (ProgramSetup) mais rien ne le
// relisait : deux appareils avaient deux programmes, et le budget d'un plan figé
// dépendait de l'appareil qui l'ouvrait. Désormais :
//
//  • TOUTE écriture de `db.meta['program']` passe par `ecrireConfig` : la clé
//    locale, puis l'événement, avec la config COMPLÈTE (jamais un fragment) ;
//  • `projeterConfig` relit le journal : `db.meta['program']` = le dernier payload
//    VALIDE par `occurred_at`. Un payload invalide ne remplace rien ;
//  • la config LOCALE n'est jamais perdue (N2) : poussée une fois au premier
//    démarrage, AVANT toute projection distante (`CONFIG_POUSSEE_S4`) ; et un
//    événement que le serveur a refusé — `queue.ts` le retire de l'outbox sans
//    trace à rejouer — ne ramène jamais une config plus ancienne : la projection
//    ne remplace la locale que par un événement valide PLUS RÉCENT qu'elle
//    (`program.at`, l'instant de la dernière écriture locale).
// ============================================================================

import { db, getMeta } from '@/db/db';
import { AXES } from '@/db/types';
import type { Axis, Fortschrittsmodus, Intensity, ProgramConfig, Specialty } from '@/db/types';
import { useSession } from '@/lib/auth/session';
import { sortEvents } from '@/lib/collections/project';
import { now } from '@/lib/clock';
import { newId, type ProgressEvent } from './events';

export const CONFIG_KEY = 'program';
/** Instant (epoch ms) de la dernière écriture de la config locale : ce à quoi un événement distant se compare (N2d). */
export const CONFIG_AT_KEY = 'program.at';
/** Garde du push initial (N2b) : lue et posée dans la MÊME transaction Dexie que le push. */
export const CONFIG_POUSSEE_S4 = 'configPousseeS4';

const INTENSITES: readonly Intensity[] = ['leicht', 'mittel', 'intensiv'];
const MODI: readonly Fortschrittsmodus[] = ['teil-first', 'cas-complet', 'specialite', 'examen-blanc'];
const JOUR = /^\d{4}-\d{2}-\d{2}$/;

const jourValide = (v: unknown): v is string => {
  if (typeof v !== 'string' || !JOUR.test(v)) return false;
  const t = Date.parse(`${v}T12:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().startsWith(v);      // 2026-02-30 : Date.parse l'accepte pas toujours, toISOString le décale
};
const nombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Valide un payload `program.configured` venu de la synchro (§12.10). Les champs connus sont typés et bornés ; le
 * reste est ignoré. `null` = inexploitable : l'événement ne remplace rien.
 *  • `examDate` et `startDate` au format ISO ;
 *  • `hoursPerSession` dans ]0, 12] (`accepterRythme` peut produire moins de 0,5 h, que l'interface ne propose pas) ;
 *  • `intensity` et `modus` dans leur enum ; `offDays` dans [0..6], au plus six jours.
 */
export function lireConfig(payload: unknown): ProgramConfig | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  if (!jourValide(p.startDate)) return null;
  if (p.examDate !== undefined && !jourValide(p.examDate)) return null;
  if (!nombre(p.hoursPerSession) || p.hoursPerSession <= 0 || p.hoursPerSession > 12) return null;
  if (!INTENSITES.includes(p.intensity as Intensity)) return null;
  if (p.modus !== undefined && !MODI.includes(p.modus as Fortschrittsmodus)) return null;
  if (!Array.isArray(p.offDays) || p.offDays.length > 6 || !p.offDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return null;
  if (p.weeks !== undefined && !(Number.isInteger(p.weeks) && (p.weeks as number) >= 1 && (p.weeks as number) <= 520)) return null;
  const niveau: Partial<Record<Axis, number>> = {};
  const brut = p.selfLevel && typeof p.selfLevel === 'object' ? (p.selfLevel as Record<string, unknown>) : {};
  for (const a of AXES) if (nombre(brut[a])) niveau[a] = Math.min(100, Math.max(0, brut[a] as number));
  const prio = Array.isArray(p.prioritySpecialties)
    ? (p.prioritySpecialties as unknown[]).filter((s): s is Specialty => typeof s === 'string' && /^[\p{L} -]{1,40}$/u.test(s)).slice(0, 30)
    : [];
  return {
    startDate: p.startDate,
    ...(p.examDate !== undefined ? { examDate: p.examDate as string } : {}),
    ...(p.weeks !== undefined ? { weeks: p.weeks as number } : {}),
    intensity: p.intensity as Intensity,
    hoursPerSession: p.hoursPerSession,
    offDays: [...new Set(p.offDays as number[])].sort((a, b) => a - b),
    prioritySpecialties: prio,
    selfLevel: niveau,
    createdAt: nombre(p.createdAt) && p.createdAt >= 0 ? p.createdAt : 0,
    ...(p.strategy === 'teil-first' || p.strategy === 'full' ? { strategy: p.strategy } : {}),
    ...(p.modus !== undefined ? { modus: p.modus as Fortschrittsmodus } : {}),
  };
}

const configEvents = (events: ProgressEvent[]) => sortEvents(events.filter((e) => e.type === 'program.configured'));

const avertis = new Set<string>();
const avertir = (e: ProgressEvent) => {
  if (avertis.has(e.id)) return;
  avertis.add(e.id);
  console.warn('[sync] program.configured invalide ignoré (la config locale est conservée)', e.id);
};

/** Le dernier payload VALIDE par `occurred_at` (puis `received_at`, puis id), ou `null`. Les invalides postérieurs sont
 *  journalisés en avertissement et ne remplacent rien. */
export function configProjetee(events: ProgressEvent[]): { config: ProgramConfig; at: number } | null {
  const tries = configEvents(events);
  for (let i = tries.length - 1; i >= 0; i--) {
    const config = lireConfig(tries[i].payload);
    if (config) { for (const ko of tries.slice(i + 1)) avertir(ko); return { config, at: Date.parse(tries[i].occurred_at) }; }
  }
  for (const ko of tries) avertir(ko);
  return null;
}

const uid = () => useSession.getState().user?.id ?? 'local';

/**
 * Écrit la config — LA seule fonction d'écriture de `db.meta['program']` (N2a, m-m). L'événement d'abord (une
 * écriture locale, jamais bloquée par le réseau), la clé locale ensuite, avec l'instant de l'événement : une
 * reconstruction qui s'interromprait entre les deux retrouve la config dans le journal.
 */
export async function ecrireConfig(config: ProgramConfig): Promise<void> {
  const { syncQueue } = await import('./queue');
  const ev = await syncQueue.push({ type: 'program.configured', subject_id: null, payload: config });
  await db.transaction('rw', db.meta, async () => {
    await db.meta.put({ key: CONFIG_KEY, value: config });
    await db.meta.put({ key: CONFIG_AT_KEY, value: Date.parse(ev.occurred_at) });
    // Une écriture S4 a émis la config complète : le push initial n'a plus d'objet (il fusionnerait avec une config plus ancienne).
    await db.meta.put({ key: CONFIG_POUSSEE_S4, value: true });
  });
}

/**
 * Le push initial (N2b). Au premier démarrage d'un client S4-2, la config locale d'avant la série 4 — qui n'a jamais
 * été projetée, seulement émise — est poussée UNE fois, horodatée à l'instant du push, avant que le journal d'un autre
 * appareil ne puisse la remplacer. Garde lue et posée avec l'événement dans UNE transaction : deux démarrages
 * concurrents ne poussent pas deux fois. Vrai ssi ce démarrage a poussé.
 */
export function pousserConfigInitiale(): Promise<boolean> {
  return db.transaction('rw', [db.meta, db.progress_events, db.outbox], async () => {
    if (await db.meta.get(CONFIG_POUSSEE_S4)) return false;
    await db.meta.put({ key: CONFIG_POUSSEE_S4, value: true });
    const locale = (await db.meta.get(CONFIG_KEY))?.value as ProgramConfig | undefined;
    if (!locale) return false;                                 // rien à pousser : le premier démarrage est passé
    // Revue S4-2 I4 : avant S4, ProgramSetup émettait déjà la config complète ; seuls `intensity` et `modus`
    // (setIntensity, setModus) restaient LOCAUX. Si le journal porte une config valide, on repart d'elle et on n'y reporte
    // que ces deux champs — une config locale périmée d'un second appareil n'écrase pas les dates ni le budget du premier.
    const emise = configProjetee(await db.progress_events.where('type').equals('program.configured').toArray());
    const pousse: ProgramConfig = emise ? (() => {
      const { modus: _m, ...base } = emise.config;
      return { ...base, intensity: locale.intensity, ...(locale.modus !== undefined ? { modus: locale.modus } : {}) };
    })() : locale;
    const at = now();
    const ev: ProgressEvent = { id: newId(), user_id: uid(), type: 'program.configured', subject_id: null, payload: pousse, occurred_at: new Date(at).toISOString() };
    await db.progress_events.put(ev);
    await db.outbox.put({ id: ev.id, attempts: 0 });
    await db.meta.put({ key: CONFIG_KEY, value: pousse });
    await db.meta.put({ key: CONFIG_AT_KEY, value: at });
    return true;
  });
}

/**
 * `db.meta['program']` = le dernier payload valide du journal (INV-68) — sauf si la config locale est plus récente
 * que lui (INV-76 d) : seul un événement valide PLUS RÉCENT la remplace. Jamais remplacée par « rien ».
 */
export async function projeterConfig(events?: ProgressEvent[]): Promise<void> {
  await pousserConfigInitiale();                               // AVANT toute projection distante (N2b)
  const source = events ?? await db.progress_events.where('type').equals('program.configured').toArray();
  const cand = configProjetee(source);
  if (!cand) return;
  const [local, localAt] = await Promise.all([db.meta.get(CONFIG_KEY), getMeta<number>(CONFIG_AT_KEY, 0)]);
  if (local?.value && cand.at <= localAt) return;
  await db.transaction('rw', db.meta, async () => {
    await db.meta.put({ key: CONFIG_KEY, value: cand.config });
    await db.meta.put({ key: CONFIG_AT_KEY, value: cand.at });
  });
}

// --- Les refus : additifs, synchronisés (§12.10) -----------------------------

const SEMAINE_ISO = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;

/** Les semaines dont le candidat a refusé le rythme proposé, et combien de refus depuis la dernière modification du
 *  programme (réserve P2 : deux refus de suite suspendent les propositions jusqu'à la prochaine modification). */
export function refusRythme(events: ProgressEvent[]): { semaines: Set<string>; depuisDerniereConfig: number } {
  const refus = events.filter((e) => e.type === 'rythme.refused' && typeof e.subject_id === 'string' && SEMAINE_ISO.test(e.subject_id));
  // Revue m5 : Date.parse, jamais l'ordre des chaînes (le serveur peut renvoyer « 2026-10-12 08:00:01+00 »).
  const derniere = Date.parse(configEvents(events).filter((e) => lireConfig(e.payload)).pop()?.occurred_at ?? '') || -Infinity;
  return {
    semaines: new Set(refus.map((e) => e.subject_id!)),
    depuisDerniereConfig: new Set(refus.filter((e) => Date.parse(e.occurred_at) > derniere).map((e) => e.subject_id!)).size,
  };
}

/** Les jours dont le rattrapage a été refusé (ou traité). */
export function refusRattrapage(events: ProgressEvent[]): Set<string> {
  return new Set(events.filter((e) => e.type === 'rattrapage.refused' && jourValide(e.subject_id)).map((e) => e.subject_id!));
}
