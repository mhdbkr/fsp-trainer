import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('./serverAi', async (orig) => {
  const real = await orig<typeof import('./serverAi')>();
  return { ...real, serverAiAvailable: vi.fn(() => true), serverStream: vi.fn() };
});
import { serverAiAvailable, serverStream, ServerAiError } from './serverAi';
import { askBrief, askConversation, setKey, canAskAi, type ChatTurn } from './onlineAi';

const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'via clé' } }] }), { status: 200 }));
beforeEach(() => {
  localStorage.clear(); vi.mocked(serverStream).mockReset(); vi.mocked(serverAiAvailable).mockReturnValue(true);
  fetchSpy.mockClear(); vi.stubGlobal('fetch', fetchSpy);
  localStorage.setItem('doctopus-provider', 'groq');
});

describe('routage IA (F3 D7/D8)', () => {
  it('serveur disponible → brief via serveur, sans clé', async () => {
    vi.mocked(serverStream).mockResolvedValue('die Aszites = Bauchwasser');
    expect(await askBrief('Aszites')).toBe('die Aszites = Bauchwasser');
    expect(serverStream).toHaveBeenCalledWith({ kind: 'brief', selection: 'Aszites' });
    expect(canAskAi()).toBe(true);
  });
  it('serveur en panne + clé → repli clé pour brief (AC-8)', async () => {
    setKey('gsk_testkey_123456');
    vi.mocked(serverStream).mockRejectedValue(new ServerAiError(503, 'no_provider'));
    expect(await askBrief('Aszites')).toBe('via clé');
  });
  it('serveur en panne sans clé → message honnête (AC-8)', async () => {
    vi.mocked(serverStream).mockRejectedValue(new ServerAiError(503, 'no_provider'));
    await expect(askBrief('Aszites')).rejects.toThrow(/IA serveur indisponible/);
  });
  it('quota → message clair', async () => {
    vi.mocked(serverStream).mockRejectedValue(new ServerAiError(429, 'quota'));
    await expect(askBrief('Aszites')).rejects.toThrow(/quota du jour/i);
  });
  it('conversation nouvelle : repli autorisé ; tour marqué via', async () => {
    setKey('gsk_testkey_123456');
    vi.mocked(serverStream).mockRejectedValue(new ServerAiError(503, 'no_provider'));
    const r = await askConversation([{ role: 'user', content: 'Frage' }]);
    expect(r).toMatchObject({ content: 'via clé', via: 'key' });
  });
  it('conversation en cours via serveur : jamais de bascule (AC-8)', async () => {
    setKey('gsk_testkey_123456');
    vi.mocked(serverStream).mockRejectedValue(new ServerAiError(503, 'no_provider'));
    const h: ChatTurn[] = [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b', via: 'server' }, { role: 'user', content: 'c' }];
    await expect(askConversation(h)).rejects.toThrow(/IA serveur indisponible/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('conversation en cours via clé : reste sur la clé même si le serveur est dispo', async () => {
    setKey('gsk_testkey_123456');
    const h: ChatTurn[] = [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b', via: 'key' }, { role: 'user', content: 'c' }];
    expect((await askConversation(h)).via).toBe('key');
    expect(serverStream).not.toHaveBeenCalled();
  });
  it('au serveur : texte simple, sans reasoningDetails', async () => {
    vi.mocked(serverStream).mockResolvedValue('ok');
    await askConversation([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b', reasoningDetails: [{ x: 1 }], via: 'server' }, { role: 'user', content: 'c' }]);
    expect(vi.mocked(serverStream).mock.calls[0][0]).toEqual({ kind: 'chat', turns: [{ role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }, { role: 'user', text: 'c' }] });
  });

  it('historique de 25 tours : ≤ 20 gardés, ≤ 12 000 car., premier tour user', async () => {
    vi.mocked(serverStream).mockResolvedValue('ok');
    const turns: ChatTurn[] = Array.from({ length: 25 }, (_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: `t${i}` }));
    await askConversation(turns);
    const sent = (vi.mocked(serverStream).mock.calls[0][0] as { kind: 'chat'; turns: { role: string; text: string }[] }).turns;
    expect(sent.length).toBeLessThanOrEqual(20);
    expect(sent[0].role).toBe('user');
    expect(sent.reduce((n, t) => n + t.text.length, 0)).toBeLessThanOrEqual(12000);
    expect(sent[sent.length - 1].text).toBe('t24');
  });

  it('un tour de 5 000 caractères est tronqué à 2 000 avant envoi', async () => {
    vi.mocked(serverStream).mockResolvedValue('ok');
    await askConversation([{ role: 'user', content: 'x'.repeat(5000) }]);
    const sent = (vi.mocked(serverStream).mock.calls[0][0] as { kind: 'chat'; turns: { role: string; text: string }[] }).turns;
    expect(sent[0].text.length).toBe(2000);
  });

  it('400 du serveur → message spécifique, distinct de « indisponible »', async () => {
    vi.mocked(serverStream).mockRejectedValue(new ServerAiError(400, 'bad_request'));
    await expect(askBrief('Aszites')).rejects.toThrow(/requête invalide/i);
  });

  it('413 du serveur → message spécifique, distinct de « indisponible »', async () => {
    vi.mocked(serverStream).mockRejectedValue(new ServerAiError(413, 'too_large'));
    await expect(askBrief('Aszites')).rejects.toThrow(/trop long/i);
  });

  it('conversation nouvelle : texte déjà diffusé avant la panne → pas de repli (pas de doublon)', async () => {
    setKey('gsk_testkey_123456');
    vi.mocked(serverStream).mockImplementation(async (_body, onToken) => {
      onToken?.('déb');
      throw new ServerAiError(0, 'network');
    });
    const onToken = vi.fn();
    await expect(askConversation([{ role: 'user', content: 'Frage' }], onToken)).rejects.toThrow(/indisponible/);
    expect(onToken).toHaveBeenCalledWith('déb');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
