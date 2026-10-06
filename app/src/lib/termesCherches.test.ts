// S4-6 — l'événement « terme cherché » est LOCAL : Dexie seulement, jamais dans `progress_events`, jamais dans
// l'outbox, jamais poussé par `syncQueue` (spec 2026-10-04 « 5 · Historique »).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dexie from 'dexie';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push, flush: vi.fn() } }));

import { db, FspDatabase } from '@/db/db';
import { freezeAt, resetClock } from '@/lib/clock';
import { noterTermeCherche } from './termesCherches';

beforeEach(async () => {
  push.mockClear();
  await Promise.all([db.termes_cherches.clear(), db.progress_events.clear(), db.outbox.clear()]);
  resetClock();
});

describe('noterTermeCherche — local, jamais envoyé', () => {
  it('écrit une ligne locale, nettoyée, à l’instant de l’horloge', async () => {
    freezeAt(new Date(2026, 9, 14, 20, 5));
    await noterTermeCherche('  Ikterus. ');
    const rows = await db.termes_cherches.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ terme: 'Ikterus', at: new Date(2026, 9, 14, 20, 5).getTime() });
  });

  it('n’est jamais poussé : ni syncQueue, ni progress_events, ni outbox', async () => {
    await noterTermeCherche('Ikterus');
    await noterTermeCherche('Aszites');
    expect(push).not.toHaveBeenCalled();
    expect(await db.progress_events.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
    expect(await db.termes_cherches.count()).toBe(2);
  });

  it('une sélection vide n’écrit rien', async () => {
    await noterTermeCherche('   ');
    expect(await db.termes_cherches.count()).toBe(0);
  });
});

describe('Dexie v7 — montée de version', () => {
  it('une base v6 existante monte en v7 sans perdre ses données, et gagne `termes_cherches`', async () => {
    const nom = `montee-v7-${Math.random()}`;
    const v6 = new Dexie(nom);
    v6.version(6).stores({ training_events: 'id, at, kind, caseId, [kind+at]', favorites: 'termId' });
    await v6.open();
    await v6.table('training_events').put({ id: 'te-1', at: 1, kind: 'drill', teile: [], source: 'libre', spentMin: 5 });
    await v6.table('favorites').put({ termId: 'fb-1', since: '2026-10-01T10:00:00Z' });
    v6.close();

    const v7 = new FspDatabase(nom);
    await v7.open();
    expect(v7.verno).toBe(7);
    expect(await v7.training_events.get('te-1')).toMatchObject({ kind: 'drill', spentMin: 5 });
    expect(await v7.favorites.get('fb-1')).toBeTruthy();
    await v7.termes_cherches.add({ at: 2, terme: 'Ikterus' });
    expect(await v7.termes_cherches.where('at').aboveOrEqual(0).count()).toBe(1);
    v7.close();
    await Dexie.delete(nom);
  });
});
