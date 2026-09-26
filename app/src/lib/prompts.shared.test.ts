import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { DOCTOPUS_SYSTEM as fromApp, buildBriefPrompt as appBrief } from './dictionary';
import { DOCTOPUS_SYSTEM as fromShared, buildBriefPrompt as sharedBrief } from '../../supabase/functions/_shared/prompts.ts';

describe('prompts partagés (F3 §3.5)', () => {
  it('app et serveur lisent la même source', () => {
    expect(fromApp).toBe(fromShared);
    expect(appBrief('Aszites')).toEqual(sharedBrief('Aszites'));
  });
  it('le module serveur est une feuille (aucun import)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, '../../supabase/functions/_shared/prompts.ts'), 'utf8');
    expect(src).not.toMatch(/^\s*import\s/m);
  });
});
