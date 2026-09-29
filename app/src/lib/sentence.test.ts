import { describe, it, expect } from 'vitest';
import { splitSentences, sentenceAt, sentenceOfRange, highlightParts, CONTEXT_MAX } from './sentence';

describe('sentence (F4a §3.3)', () => {
  it('abréviations du corpus : « z. B. », « Z. n. », « V. a. », « ca. », « bzw. » ne coupent pas la phrase', () => {
    const t = 'Z. n. Appendektomie vor ca. 5 Jahren. Schmerzen, z. B. beim Gehen, bzw. Treppensteigen. V. a. Pneumonie bei Fieber.';
    expect(splitSentences(t).map((s) => s.text.trim())).toEqual([
      'Z. n. Appendektomie vor ca. 5 Jahren.', 'Schmerzen, z. B. beim Gehen, bzw. Treppensteigen.', 'V. a. Pneumonie bei Fieber.',
    ]);
  });
  it('sentenceAt : la seule phrase qui contient l\'offset, espaces normalisés', () => {
    const t = 'Er hat Fieber.   Seit gestern  besteht Aszites. Kein Ikterus.';
    expect(sentenceAt(t, t.indexOf('Aszites'))).toBe('Seit gestern besteht Aszites.');
    expect(sentenceAt(t, 0)).toBe('Er hat Fieber.');
  });
  it('sentenceAt : phrase > 300 car. → fenêtre de 300 qui garde le mot', () => {
    const long = `${'Wort '.repeat(100)}Aszites ${'Ende '.repeat(100)}.`;
    const s = sentenceAt(long, long.indexOf('Aszites'));
    expect(s.length).toBeLessThanOrEqual(CONTEXT_MAX);
    expect(s).toContain('Aszites');
  });
  it('sentenceOfRange : offset pris dans le Range DOM, pas dans une recherche de texte', () => {
    document.body.innerHTML = '<p id="p">Aszites ist selten. Heute <b>Aszites</b> und Ödeme.</p>';
    const b = document.querySelector('b')!;
    const r = document.createRange(); r.selectNodeContents(b);
    expect(sentenceOfRange(r)).toBe('Heute Aszites und Ödeme.');
  });
  it('highlightParts : mot entier, casse et flexion simples ; absent → null', () => {
    expect(highlightParts('Aszitesflüssigkeit punktiert.', 'Aszites')).toBeNull();
    expect(highlightParts('Seit gestern besteht Aszites.', 'aszites')).toEqual(['Seit gestern besteht ', 'Aszites', '.']);
    expect(highlightParts('Beidseitige Ödeme.', 'Ödem')).toEqual(['Beidseitige ', 'Ödeme', '.']);
    expect(highlightParts('Sondenernährung', 'Sonde')).toBeNull();
  });
  it('un ordinal ne coupe pas la phrase (revue B4) : « 3. Lendenwirbel », « am 12. März »', () => {
    expect(splitSentences('V. a. Fraktur des 3. Lendenwirbel bei Sturz. Patient stabil.').map((s) => s.text.trim())).toEqual(['V. a. Fraktur des 3. Lendenwirbel bei Sturz.', 'Patient stabil.']);
    expect(splitSentences('Aufnahme am 12. März wegen Dyspnoe. Kein Fieber.')).toHaveLength(2);
  });
});
