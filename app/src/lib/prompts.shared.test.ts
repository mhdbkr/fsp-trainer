import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { DOCTOPUS_SYSTEM as fromApp, buildBriefPrompt as appBrief } from './dictionary';
import { DOCTOPUS_SYSTEM as fromShared, buildBriefPrompt as sharedBrief, buildBedeutungPrompt, cleanBedeutung } from '../../supabase/functions/_shared/prompts.ts';

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
  it('buildBedeutungPrompt : ≤ 6 mots, sans emoji, avec la phrase de contexte', () => {
    const p = buildBedeutungPrompt('Belastungsdyspnoe', 'Seit Wochen besteht eine Belastungsdyspnoe.');
    expect(p.system).toMatch(/HÖCHSTENS sechs Wörtern/);
    expect(p.system).toMatch(/keine Emoji/);
    expect(p.user).toContain('Satz: „Seit Wochen besteht eine Belastungsdyspnoe.“');
    expect(buildBedeutungPrompt('Wort').user).toBe('Wort: „Wort“');
  });
  it('buildBedeutungPrompt : contexte nettoyé — ni guillemets ni saut de ligne injectés (revue B5 M1)', () => {
    const p = buildBedeutungPrompt('Wort', 'Zeile1\nZeile2 „injectee“ "encore" fin');
    const lines = p.user.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('Satz: „Zeile1 Zeile2 injectee encore fin“');
  });
  it('cleanBedeutung : texte brut ≤ 6 mots, sans emoji, guillemets, article ni ponctuation finale', () => {
    expect(cleanBedeutung('die Atemnot 😮‍💨')).toBe('Atemnot');
    expect(cleanBedeutung('„Flüssigkeit in der Bauchhöhle.“')).toBe('Flüssigkeit in der Bauchhöhle');
    expect(cleanBedeutung('die Dyspnoe = Atemnot · 🇫🇷 dyspnée')).toBe('Atemnot');
    expect(cleanBedeutung('eins zwei drei vier fünf sechs sieben acht')).toBe('eins zwei drei vier fünf sechs');
    expect(cleanBedeutung('Bedeutung: Atemnot bei Belastung.\nErklärung …')).toBe('Atemnot bei Belastung');
    expect(cleanBedeutung('zum Bauch gehörend')).toBe('zum Bauch gehörend');
    expect(cleanBedeutung('🙂')).toBe('');
  });
  it('cleanBedeutung : modificateur de teint, caractères invisibles, préfixe collé (revue B5 M2)', () => {
    expect(cleanBedeutung('Atemnot 👍🏽')).toBe('Atemnot');
    expect(cleanBedeutung('Atem‮not​ bei Belastung')).toBe('Atemnot bei Belastung');
    expect(cleanBedeutung('Bedeutung:Atemnot')).toBe('Atemnot');
  });
});
