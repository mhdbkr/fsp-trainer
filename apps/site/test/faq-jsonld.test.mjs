import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const distFile = fileURLToPath(new URL('../dist/de/faq/index.html', import.meta.url));

function extractJsonLd(html) {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'bloc application/ld+json introuvable');
  return JSON.parse(m[1]);
}

test('faq dist : JSON-LD FAQPage unique, valide, généré depuis la collection', { skip: !existsSync(distFile) && 'npm run build requis avant ce test' }, () => {
  const html = readFileSync(distFile, 'utf8');
  assert.equal((html.match(/"@type":"FAQPage"/g) ?? []).length, 1);
  const faqPage = extractJsonLd(html);
  assert.equal(faqPage['@type'], 'FAQPage');
  assert.ok(Array.isArray(faqPage.mainEntity));
  assert.equal(faqPage.mainEntity.length, 8);
  for (const q of faqPage.mainEntity) {
    assert.equal(q['@type'], 'Question');
    assert.ok(q.name.length > 0);
    assert.equal(q.acceptedAnswer['@type'], 'Answer');
    assert.ok(q.acceptedAnswer.text.length > 0);
  }
  const questions = faqPage.mainEntity.map((q) => q.name);
  // sous-ensemble cohérent avec FaqShort (T2.2) : « Werde ich bestehen? » répond à la
  // même question sur les deux surfaces, sans contradiction.
  assert.ok(questions.includes('Werde ich bestehen?'));
});

test('faq dist : <details> natifs, aucune dépendance JS pour l\'accordéon', { skip: !existsSync(distFile) && 'npm run build requis avant ce test' }, () => {
  const html = readFileSync(distFile, 'utf8');
  assert.match(html, /<details/);
  assert.doesNotMatch(html, /addEventListener\(['"]click['"]/);
});
