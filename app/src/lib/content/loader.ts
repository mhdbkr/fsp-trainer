import { db, getMeta, setMeta } from '@/db/db';
import { getAccessToken } from '@/lib/auth/session';
import { getEntitlements } from '@/lib/entitlements';
import { wireLinks } from '@/data/seed';
import { applyContent, type ContentItem } from './apply';

export class FirstLoadRequired extends Error { constructor() { super('Premier chargement : connexion requise'); } }
const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content`;

async function relink() {
  const [cases, fachbegriffe, fachwissen, aufklaerungen] = await Promise.all([
    db.cases.toArray(), db.fachbegriffe.toArray(), db.fachwissen.toArray(), db.aufklaerungen.toArray(),
  ]);
  wireLinks(cases, fachbegriffe, fachwissen, aufklaerungen);
  await db.transaction('rw', [db.cases, db.fachbegriffe, db.fachwissen, db.aufklaerungen], async () => {
    await db.cases.bulkPut(cases);
    await db.fachbegriffe.bulkPut(fachbegriffe);
    await db.fachwissen.bulkPut(fachwissen);
    await db.aufklaerungen.bulkPut(aufklaerungen);
  });
}

export const contentLoader = {
  /** Delta depuis la version locale. Hors ligne : no-op si un cache existe, FirstLoadRequired sinon. */
  async sync(opts: { full?: boolean } = {}): Promise<{ version: number; changed: number }> {
    // `full` : rechargement depuis zéro. Nécessaire au CHANGEMENT DE PLAN — la
    // version locale est déjà la dernière, le delta serait vide, et le serveur
    // ne peut pas savoir que ce client n'a jamais reçu les items du nouveau tier.
    // applyContent est idempotent : recharger tout est sûr.
    const local = opts.full ? 0 : await getMeta<number>('contentVersion', 0);
    const tier = getEntitlements().limit('content.tier') ?? 3;
    let res: Response;
    try {
      const token = await getAccessToken();
      res = await fetch(`${FN}?since=${local}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    } catch {
      if (local === 0 && !opts.full) throw new FirstLoadRequired();
      return { version: local, changed: 0 };
    }
    if (!res.ok) {
      if (local === 0 && !opts.full) throw new FirstLoadRequired();
      return { version: local, changed: 0 };
    }
    const { version, items } = (await res.json()) as { version: number; items: ContentItem[] };
    const { upserted, removed } = await applyContent(db, items, tier);
    if (upserted || removed) await relink();
    await setMeta('contentVersion', version);
    return { version, changed: upserted + removed };
  },
};
