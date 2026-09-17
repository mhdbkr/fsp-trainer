import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AI_TARGETS, buildLaunchUrl, launch, loadPrefs, savePrefs, getPending, setPending } from './targets';
import { PREFILL_MAX } from './prompt';
import { db } from '@/db/db';

const T = Object.fromEntries(AI_TARGETS.map((t) => [t.id, t]));

describe('cibles', () => {
  it('URLs exactes par cible', () => {
    expect(buildLaunchUrl(T.chatgpt, 'Hallo Welt')).toEqual({ url: 'https://chatgpt.com/?q=Hallo%20Welt', prefilled: true });
    expect(buildLaunchUrl(T.claude, 'Hallo Welt')).toEqual({ url: 'https://claude.ai/new?q=Hallo%20Welt', prefilled: true });
    expect(buildLaunchUrl(T.perplexity, 'x')).toEqual({ url: 'https://www.perplexity.ai/search?q=x', prefilled: true });
    expect(buildLaunchUrl(T.grok, 'x')).toEqual({ url: 'https://grok.com/?q=x', prefilled: true });
    expect(buildLaunchUrl(T.gemini, 'x')).toEqual({ url: 'https://gemini.google.com/app', prefilled: false });
    expect(T.chatgpt.submits).toBe(true); expect(T.claude.submits).toBe(false);
  });
  it('au-delà de PREFILL_MAX → URL de base sans ?q=', () => {
    const long = 'a'.repeat(PREFILL_MAX + 1);
    expect(buildLaunchUrl(T.chatgpt, long)).toEqual({ url: 'https://chatgpt.com/', prefilled: false });
  });
  it('launch : copie puis ouvre ; copie échouée → copied false mais ouvre quand même', async () => {
    const open = vi.fn(); const copy = vi.fn().mockResolvedValue(undefined);
    expect(await launch(T.claude, 'p', { open, copy })).toEqual({ opened: true, copied: true, prefilled: true });
    expect(copy).toHaveBeenCalledWith('p'); expect(open).toHaveBeenCalledWith('https://claude.ai/new?q=p');
    const copyFail = vi.fn().mockRejectedValue(new Error('denied'));
    expect(await launch(T.gemini, 'p', { open, copy: copyFail })).toEqual({ opened: true, copied: false, prefilled: false });
  });
});

describe('préférences et trace', () => {
  beforeEach(() => db.meta.clear());
  it('défauts puis persistance', async () => {
    expect(await loadPrefs()).toEqual({ target: 'chatgpt', scope: 'exam+feedback', feedbackLang: 'fr' });
    await savePrefs({ target: 'claude', scope: 'anamnese', feedbackLang: 'de' });
    expect(await loadPrefs()).toEqual({ target: 'claude', scope: 'anamnese', feedbackLang: 'de' });
  });
  it('pending set/get/clear', async () => {
    expect(await getPending()).toBeNull();
    await setPending({ caseId: 'c1', targetId: 'chatgpt', scope: 'exam', at: 123 });
    expect(await getPending()).toEqual({ caseId: 'c1', targetId: 'chatgpt', scope: 'exam', at: 123 });
    await setPending(null); expect(await getPending()).toBeNull();
  });
});
