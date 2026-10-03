import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AI_TARGETS, CAPABILITY_TTL_DAYS, capabilityProblems, launchPlan, copyText,
  loadTarget, saveTarget, setPending, readPending, type AiTarget,
} from './targets';
import { db } from '@/db/db';

const T = Object.fromEntries(AI_TARGETS.map((t) => [t.id, t])) as Record<string, AiTarget>;
const NOW = Date.parse('2026-10-03T12:00:00Z');
const DAY = 86_400_000;

describe('cibles retenues par la direction', () => {
  it('ChatGPT et Gemini, rien d\'autre', () => {
    expect(AI_TARGETS.map((t) => t.id)).toEqual(['chatgpt', 'gemini']);
  });

  it('INV-34 : chaque capacité est sourcée, datée, cohérente (C1, C3)', () => {
    for (const t of AI_TARGETS) expect(capabilityProblems(t.capability)).toEqual([]);
  });

  it('C1 / C3 : une capacité sans preuve, ou pré-remplissage sans limite, est refusée', () => {
    const base = T.chatgpt.capability;
    expect(capabilityProblems({ ...base, evidence: '' })).toContain('C1');
    expect(capabilityProblems({ ...base, verifiedAt: '' })).toContain('C1');
    expect(capabilityProblems({ ...base, prefillParam: 'q', maxPrefillChars: null })).toContain('C3');
  });

  it('pré-remplissage qui envoie seul : refusé (le candidat doit saluer avant que l\'IA ne parle)', () => {
    expect(capabilityProblems({ ...T.chatgpt.capability, prefillParam: 'q', maxPrefillChars: 4000, autoSubmits: true })).toContain('AUTO_SUBMIT');
  });
});

describe('INV-33 — le libellé ne promet que ce qui est vérifié', () => {
  const verified = (over: Partial<AiTarget['capability']> = {}): AiTarget => ({
    ...T.chatgpt,
    capability: { ...T.chatgpt.capability, prefillParam: 'q', maxPrefillChars: 4000, verifiedAt: '2026-09-30', ...over },
  });

  it('niveau 1 seulement si paramètre, longueur et fraîcheur sont tous vrais', () => {
    const p = launchPlan(verified(), 'Hallo Welt', NOW);
    expect(p.level).toBe(1);
    expect(p.url).toBe('https://chatgpt.com/?q=Hallo%20Welt');
    expect(p.label).toBe('Ouvrir ChatGPT avec le prompt');
  });

  it('envoi automatique → niveau 2, quelles que soient longueur et fraîcheur', () => {
    expect(launchPlan(verified({ autoSubmits: true }), 'Hallo Welt', NOW).level).toBe(2);
  });

  it('trop long une fois encodé → niveau 2', () => {
    expect(launchPlan(verified(), '„'.repeat(500), NOW).level).toBe(2); // 500 car. bruts, 4 500 encodés
  });

  it(`vérification de plus de ${CAPABILITY_TTL_DAYS} jours → niveau 2 (C2)`, () => {
    const stale = verified({ verifiedAt: new Date(NOW - (CAPABILITY_TTL_DAYS + 1) * DAY).toISOString().slice(0, 10) });
    expect(launchPlan(stale, 'x', NOW).level).toBe(2);
  });

  it('les cibles livrées sont au niveau 2 : copie + ouverture de l\'app', () => {
    const g = launchPlan(T.chatgpt, 'x', NOW);
    expect(g).toEqual({ level: 2, url: 'https://chatgpt.com/#native', label: 'Copier et ouvrir ChatGPT' });
    expect(launchPlan(T.gemini, 'x', NOW)).toEqual({ level: 2, url: 'https://gemini.google.com/app', label: 'Copier et ouvrir Gemini' });
  });
});

describe('copyText', () => {
  it('vrai seulement si l\'écriture a réussi (F3)', async () => {
    expect(await copyText('p', vi.fn().mockResolvedValue(undefined))).toBe(true);
    expect(await copyText('p', vi.fn().mockRejectedValue(new Error('denied')))).toBe(false);
    expect(await copyText('p', undefined)).toBe(false);
  });
});

describe('mémoire et trace', () => {
  beforeEach(() => db.meta.clear());

  it('la cible choisie est rappelée ; une ancienne cible retirée est oubliée', async () => {
    expect(await loadTarget()).toBeNull();
    await saveTarget('gemini');
    expect(await loadTarget()).toBe('gemini');
    await db.meta.put({ key: 'externalAi.target', value: 'claude' });
    expect(await loadTarget()).toBeNull();
  });

  it('trace : Teil d\'ancrage, et lecture tolérante de l\'ancien `scope`', async () => {
    expect(await readPending()).toBeNull();
    await setPending({ caseId: 'c1', targetId: 'chatgpt', teil: 'fallvorstellung', at: 1 });
    expect(await readPending()).toEqual({ caseId: 'c1', targetId: 'chatgpt', teil: 'fallvorstellung', at: 1 });
    await db.meta.put({ key: 'externalAi.pending', value: { caseId: 'c1', targetId: 'claude', scope: 'anamnese', at: 2 } });
    expect(await readPending()).toEqual({ caseId: 'c1', targetId: 'claude', teil: 'anamnese', at: 2 });
    await db.meta.put({ key: 'externalAi.pending', value: { caseId: 'c1', targetId: 'claude', scope: 'exam+feedback', at: 3 } });
    expect((await readPending())?.teil).toBeUndefined();
    await setPending(null);
    expect(await readPending()).toBeNull();
  });
});
