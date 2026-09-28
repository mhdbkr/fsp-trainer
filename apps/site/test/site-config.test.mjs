import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSite } from '../src/lib/site.ts';
import { ctaFor, pricingCtaFor } from '../src/lib/cta.ts';

test('defaults: placeholders, not public, brand/product/tagline named', () => {
  const s = readSite({});
  assert.equal(s.public, false);
  assert.match(s.domain, /^\{\{SITE_DOMAIN\}\}$/);
  assert.equal(s.brandName, 'Doctopus');
  assert.equal(s.productName, 'FSP Trainer');
  // MESSAGES.md §03 : l'accroche sert le hero, le descripteur sert la balise <title>
  // et les annuaires — il porte les mots qu'on tape dans un moteur de recherche.
  assert.equal(s.tagline, 'Dein Trainingsraum für die Sprache der Medizin');
  assert.equal(s.descriptor, 'Dein Trainingsraum für medizinisches Deutsch');
  assert.equal(s.analyticsProvider, 'plausible');
});
test('env overrides public and analytics endpoint', () => {
  const s = readSite({ SITE_PUBLIC: 'true', ANALYTICS_ENDPOINT: 'https://plausible.example.eu/api/event' });
  assert.equal(s.public, true);
  assert.equal(s.analyticsEndpoint, 'https://plausible.example.eu/api/event');
});
test('invalid analytics provider throws', () => {
  assert.throws(() => readSite({ ANALYTICS_PROVIDER: 'ga' }));
});
test('global cta points to signup and names freeCases', () => {
  const c = ctaFor(readSite({}), 12);
  assert.equal(c.href, '{{APP_URL}}/signup');
  assert.equal(c.label, 'Mit 12 kostenlosen Fällen starten');
  assert.equal(c.micro, 'Ohne Kreditkarte');
});
test('pricing cta: free = signup with named freeCases (C6), pro/premium = app pricing with plan', () => {
  const free = pricingCtaFor(readSite({}), 'free', 12);
  assert.equal(free.href, '{{APP_URL}}/signup');
  assert.equal(free.label, 'Mit 12 kostenlosen Fällen starten');
  const c = pricingCtaFor(readSite({}), 'pro', 12);
  assert.equal(c.href, '{{APP_URL}}/pricing?plan=pro');
  assert.equal(c.label, 'Pro wählen');
});
