import type { FspDatabase } from '@/db/db';
import { freshSrs } from '@/lib/srs';

export interface ContentItem { id: string; kind: 'case'|'fachwissen'|'fachbegriff'|'aufklaerung'|'guide'|'muster'; tier: number; version: number; payload: unknown; deleted: boolean }

const TABLE: Record<ContentItem['kind'], 'cases'|'fachwissen'|'fachbegriffe'|'aufklaerungen'|'guides'|null> = {
  case: 'cases', fachwissen: 'fachwissen', fachbegriff: 'fachbegriffe', aufklaerung: 'aufklaerungen', guide: 'guides', muster: null,
};

/** Applique un delta au cache Dexie. Le tier est stocké avec l'objet (`_tier`) pour pouvoir purger en cas de perte de droits. */
export async function applyContent(db: FspDatabase, items: ContentItem[], allowedTier: number): Promise<{ upserted: number; removed: number }> {
  let upserted = 0, removed = 0;
  const musterById = new Map<string, unknown>();
  await db.transaction('rw', [db.cases, db.fachwissen, db.fachbegriffe, db.aufklaerungen, db.guides], async () => {
    for (const it of items) {
      if (it.kind === 'muster') { musterById.set(it.id, it.payload); continue; }
      const table = db.table(TABLE[it.kind]!);
      if (it.deleted) { await table.delete(it.id); removed++; continue; }
      // Fachbegriffe : préserver le SRS local (il vit dans l'objet)
      const prev = it.kind === 'fachbegriff' ? await table.get(it.id) : undefined;
      // Fachbegriff : le payload publié ne porte PAS de srs (état d'apprentissage,
      // propre à l'utilisateur). On garde le srs local s'il existe, sinon on en
      // crée un neuf — sans ça, tout écran qui lit `srs.dueDate` explose.
      const srs = it.kind === 'fachbegriff' ? { srs: prev?.srs ?? freshSrs() } : {};
      const stored: Record<string, unknown> = { ...(it.payload as Record<string, unknown>), id: it.id, ...srs, _tier: it.tier };
      await table.put(stored);
      upserted++;
    }
    // Muster : fusionnés dans le cas correspondant (musterSaetze), comme le faisait ensureSeeded
    for (const [caseId, muster] of musterById) {
      const c = await db.cases.get(caseId.replace(/^muster-/, ''));
      if (c) { await db.cases.put({ ...c, musterSaetze: muster as never }); }
    }
    // Purge : tout ce dont le tier dépasse le droit courant (perte de droits).
    // Le serveur ne renvoie JAMAIS d'item au-dessus du tier de l'appelant
    // (RLS) : la purge ne vise donc que le cache hérité, pas le delta reçu.
    for (const t of [db.cases, db.fachwissen, db.fachbegriffe, db.aufklaerungen, db.guides]) {
      const over = await t.filter((r: unknown) => ((r as { _tier?: number })._tier ?? 1) > allowedTier).primaryKeys();
      if (over.length) { await t.bulkDelete(over); removed += over.length; }
    }
  });
  return { upserted, removed };
}
