import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import { toggleFavorite } from './index';

// Contrairement à index.test.ts (syncQueue mocké), ce fichier utilise le
// VRAI syncQueue pour vérifier que toggleFavorite écrit bien dans l'outbox
// et émet l'événement term.favorited — le réseau est neutralisé en amont
// (getAccessToken → null) pour que flush() soit un no-op sans appel réseau.
// Le client Supabase exige VITE_SUPABASE_URL/ANON_KEY au chargement : absent en
// CI (pas de .env), donc mocké — rien ici ne doit toucher le réseau.
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: null } })), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })) }, functions: { invoke: vi.fn() } },
  callFn: vi.fn(),
}));
vi.mock('@/lib/auth/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/session')>();
  return { ...actual, getAccessToken: vi.fn(async () => null) };
});

describe('collections mutations — outbox réel (syncQueue non mocké)', () => {
  beforeEach(async () => {
    await db.progress_events.clear();
    await db.decks.clear();
    await db.deck_terms.clear();
    await db.favorites.clear();
    await db.outbox.clear();
  });

  it('toggleFavorite écrit une ligne d\'outbox et un événement term.favorited', async () => {
    expect(await toggleFavorite('fb-1')).toBe(true);
    const outboxRows = await db.outbox.toArray();
    expect(outboxRows.length).toBeGreaterThan(0);
    const events = await db.progress_events.toArray();
    expect(events.map((e) => e.type)).toContain('term.favorited');
    const ev = events.find((e) => e.type === 'term.favorited')!;
    expect(outboxRows.some((r) => r.id === ev.id)).toBe(true);
  });
});
