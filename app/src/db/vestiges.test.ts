// M1 (revue s3-programme) : vestiges du plan recalculé retirés (contrat §9).
import { describe, it, expect } from 'vitest';
import { db } from './db';

describe('M1 — db.plan abandonné en v5', () => {
  it('la table morte `plan` n\'existe plus', () => {
    expect(db.tables.map((t) => t.name)).not.toContain('plan');
  });
});
