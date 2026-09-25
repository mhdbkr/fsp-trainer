import Dexie, { type Table } from 'dexie';
import type {
  Case, Fachbegriff, Fachwissen, AufklaerungItem, Guide, Simulation, PlanEntry, Meta,
  Deck, DeckTerm, Favorite, PersonalTerm,
} from './types';
import type { ProgressEvent, OutboxRow } from '@/lib/sync/events';
import { getActiveUserId } from '@/lib/auth/accounts';

// ============================================================================
// IndexedDB via Dexie. Tout est local, aucune requête réseau à l'exécution.
// Les index multiEntry (*centers, *linkedCaseIds…) permettent les requêtes
// d'interconnexion (ex. "tous les cas où ce terme apparaît").
// ============================================================================

export const DB_BASE_NAME = 'fsp-cockpit';

/** Résout le nom de la base de données pour un compte utilisateur. */
export function dbNameFor(userId: string | null): string {
  return userId === null ? DB_BASE_NAME : `${DB_BASE_NAME}-${userId}`;
}

/** Compte auquel CE tab est lié : l'identifiant capturé quand le module a
 *  résolu le nom de la base. Fixe jusqu'au rechargement — une session d'un
 *  autre compte reçue d'un autre onglet ne doit jamais écrire ici. */
export const DB_USER_ID: string | null = getActiveUserId();

/** « Oublier ce compte sur cet appareil » : supprime sa base, et elle seule. */
export const deleteAccountDb = (userId: string): Promise<void> => Dexie.delete(dbNameFor(userId));

export class FspDatabase extends Dexie {
  cases!: Table<Case, string>;
  fachbegriffe!: Table<Fachbegriff, string>;
  fachwissen!: Table<Fachwissen, string>;
  aufklaerungen!: Table<AufklaerungItem, string>;
  guides!: Table<Guide, string>;
  simulations!: Table<Simulation, string>;
  plan!: Table<PlanEntry, string>;
  meta!: Table<Meta, string>;
  progress_events!: Table<ProgressEvent, string>;
  outbox!: Table<OutboxRow, string>;
  decks!: Table<Deck, string>;
  deck_terms!: Table<DeckTerm, [string, string]>;
  favorites!: Table<Favorite, string>;
  personal_terms!: Table<PersonalTerm, string>;

  constructor(name: string = dbNameFor(DB_USER_ID)) {
    super(name);
    this.version(1).stores({
      cases: 'id, pathology, specialty, status, frequency, difficulty, *centers, *linkedFachbegriffeIds',
      fachbegriffe: 'id, term, specialty, srs.state, srs.dueDate, *pathologyTags, *centers, *linkedCaseIds',
      fachwissen: 'id, pathology, specialty, *linkedCaseIds',
      aufklaerungen: 'id, name, category, *linkedCaseIds',
      guides: 'id, type, specialty',
      simulations: 'id, caseId, date, role',
      plan: 'id, date, caseId, done',
      meta: 'key',
    });
    this.version(2).stores({
      progress_events: 'id, user_id, type, subject_id, occurred_at, [user_id+type+subject_id]',
      outbox: 'id, attempts',
    });
    this.version(3).stores({
      decks: 'id, kind, name',
      deck_terms: '[deckId+termId], deckId, termId',
      favorites: 'termId',
    });
    this.version(4).stores({
      personal_terms: 'id, term, srs.state, srs.dueDate',
    });
  }
}

export const db = new FspDatabase();

// --- Meta helpers -----------------------------------------------------------
export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.meta.get(key);
  return row ? (row.value as T) : fallback;
}
export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

// --- Import en masse (branché dès le prototype) -----------------------------
// Les données réelles (581 cas, 2249 Fachbegriffe, Fachwissen livre/ODAK)
// seront injectées via ces fonctions. bulkPut = idempotent sur l'id.
export async function importCases(items: Case[]) { await db.cases.bulkPut(items); }
export async function importFachbegriffe(items: Fachbegriff[]) { await db.fachbegriffe.bulkPut(items); }
export async function importFachwissen(items: Fachwissen[]) { await db.fachwissen.bulkPut(items); }
export async function importAufklaerungen(items: AufklaerungItem[]) { await db.aufklaerungen.bulkPut(items); }
export async function importGuides(items: Guide[]) { await db.guides.bulkPut(items); }

/** Réinitialise entièrement la base (utile pendant le dev / re-seed). */
export async function wipeDatabase() {
  await Promise.all([
    db.cases.clear(), db.fachbegriffe.clear(), db.fachwissen.clear(),
    db.aufklaerungen.clear(), db.guides.clear(), db.simulations.clear(),
    db.plan.clear(), db.meta.clear(),
    db.decks.clear(), db.deck_terms.clear(), db.favorites.clear(),
    db.personal_terms.clear(),
  ]);
}
