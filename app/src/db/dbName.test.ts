import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DB_BASE_NAME, dbNameFor, deleteAccountDb } from './db';
import Dexie from 'dexie';

describe('dbName', () => {
  beforeEach(() => {
    // Mock localStorage for jsdom
    const store: Record<string, string> = {};
    const mock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      length: Object.keys(store).length,
      key: (index: number) => Object.keys(store)[index] || null,
    };
    vi.stubGlobal('localStorage', mock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('DB_BASE_NAME is "fsp-cockpit"', () => {
    expect(DB_BASE_NAME).toBe('fsp-cockpit');
  });

  it('dbNameFor(null) returns DB_BASE_NAME', () => {
    expect(dbNameFor(null)).toBe('fsp-cockpit');
  });

  it('dbNameFor("a") returns "fsp-cockpit-a"', () => {
    expect(dbNameFor('a')).toBe('fsp-cockpit-a');
  });

  it('dbNameFor("user-123") returns "fsp-cockpit-user-123"', () => {
    expect(dbNameFor('user-123')).toBe('fsp-cockpit-user-123');
  });

  it('deleteAccountDb("a") deletes the database for user "a"', async () => {
    // Create two databases with a table to ensure they're created
    const a = new Dexie(dbNameFor('a'));
    const b = new Dexie(dbNameFor('b'));

    a.version(1).stores({ test: '++id' });
    b.version(1).stores({ test: '++id' });

    // Perform an operation to create the databases
    await a.table('test').add({});
    await b.table('test').add({});

    // Both should exist
    expect(await Dexie.exists('fsp-cockpit-a')).toBe(true);
    expect(await Dexie.exists('fsp-cockpit-b')).toBe(true);

    // Close them
    a.close();
    b.close();

    // Delete only "a"
    await deleteAccountDb('a');

    // "a" should be gone, "b" should remain
    expect(await Dexie.exists('fsp-cockpit-a')).toBe(false);
    expect(await Dexie.exists('fsp-cockpit-b')).toBe(true);
  });
});
