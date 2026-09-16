import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { checkLegal } from '../scripts/check-legal.mjs';

const NOTICE = 'Doctopus ist ein Sprachlernwerkzeug zur Vorbereitung auf die FSP — kein Medizinprodukt, keine klinische Entscheidungshilfe, keine Erfolgsgarantie.';
const footer = `<footer><p data-notice="language-tool">${NOTICE}</p><a href="/de/impressum/">I</a><a href="/de/datenschutz/">D</a><a href="/de/agb/">A</a><a href="/de/widerruf/">W</a></footer>`;
function fakeDist(opts = {}) {
  const dist = mkdtempSync(join(tmpdir(), 'dist-'));
  const page = (p, main = '', extra = '') => { mkdirSync(join(dist, p), { recursive: true }); writeFileSync(join(dist, p, 'index.html'), `<html><body><main>${main}</main>${opts.noFooter ? '' : footer}${extra}</body></html>`); };
  page('de', `<p data-notice="language-tool">${NOTICE}</p>`);
  page('de/preise', 'inkl. MwSt. Widerrufsrecht: 14 Tage');
  for (const l of ['impressum', 'datenschutz', 'agb', 'widerruf']) page(`de/${l}`, opts.validated ? '<p data-legal-status="validated">ok</p>' : '<div data-legal-status="draft">Entwurf</div>');
  return dist;
}
const legalDir = fileURLToPath(new URL('../../../docs/legal/', import.meta.url));

test('valid preview dist passes', () => assert.deepEqual(checkLegal({ dist: fakeDist(), legalDir, sitePublic: false }), []));
test('missing footer fails on every page', () => assert.ok(checkLegal({ dist: fakeDist({ noFooter: true }), legalDir, sitePublic: false }).length >= 6));
test('public with empty validated_by fails', () => {
  const errs = checkLegal({ dist: fakeDist(), legalDir, sitePublic: true });
  assert.ok(errs.some((e) => /validated_by/.test(e)));
});
