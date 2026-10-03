#!/usr/bin/env node
// Vérifie que tokens.json == les valeurs que l'app lit encore chez elle
// (app/tailwind.config.js + app/src/styles/index.css). Sort en code 1 sur
// toute dérive. Tant que app/ n'est pas migré vers apps/app et ne consomme
// pas @doctopus/tokens, c'est CE script qui garantit « une charte, deux
// surfaces » (ADR-0010). Emplacement de l'app surchargeable : DOCTOPUS_APP_DIR.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, '..');
const appDir = resolve(process.env.DOCTOPUS_APP_DIR ?? join(pkg, '..', '..', 'app'));
const tokens = JSON.parse(readFileSync(join(pkg, 'tokens.json'), 'utf8'));

const twPath = join(appDir, 'tailwind.config.js');
const cssPath = join(appDir, 'src', 'styles', 'index.css');
for (const p of [twPath, cssPath]) {
  if (!existsSync(p)) { console.error(`check-parity: introuvable ${p}`); process.exit(2); }
}
const tw = (await import(pathToFileURL(twPath).href)).default.theme.extend;
const css = readFileSync(cssPath, 'utf8');

const drifts = [];
const expect = (name, pkgVal, appVal) => {
  if (String(pkgVal) !== String(appVal)) drifts.push(`${name}\n    tokens.json : ${pkgVal}\n    app         : ${appVal}`);
};
const cssVar = (name, scope = ':root') => {
  const block = css.match(new RegExp(`${scope.replace('.', '\\.')}\\s*\\{([^}]*)\\}`, 'g'))
    ?.map((b) => b.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim()).find(Boolean);
  return block ?? '(absent)';
};
const cssRule = (selector, prop) => {
  const re = new RegExp(`${selector.replace(/[.:()]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`);
  const body = css.match(re)?.[1] ?? '';
  return body.match(new RegExp(`(?:^|\\n)\\s*${prop}:\\s*([\\s\\S]*?);`))?.[1]?.replace(/\s+/g, ' ').trim() ?? '(absent)';
};

// ── Couleurs ────────────────────────────────────────────────────────────────
for (const scale of ['brand', 'signal']) {
  for (const [step, hex] of Object.entries(tokens.color[scale])) {
    if (step.startsWith('$')) continue;
    expect(`color.${scale}.${step}`, hex, tw.colors[scale][step]);
  }
}
expect('color.paper', tokens.color.paper.DEFAULT, tw.colors.paper);
for (const [k, v] of Object.entries(tokens.color.ink)) if (!k.startsWith('$')) expect(`color.ink.${k}`, v, tw.colors.ink[k]);
expect('color.focus.light', tokens.color.focus.light, cssVar('--focus-ring', ':root'));
expect('color.focus.dark', tokens.color.focus.dark, cssVar('--focus-ring', '.dark'));

// ── Fontes ──────────────────────────────────────────────────────────────────
for (const f of ['sans', 'display', 'mono']) expect(`font.${f}`, tokens.font[f], tw.fontFamily[f].join(', '));

// ── Typo / mouvement ────────────────────────────────────────────────────────
expect('type.headingTracking', tokens.type.headingTracking, tw.letterSpacing.tightish);
expect('type.headingTracking (css h1-h3)', tokens.type.headingTracking, cssRule('h1, h2, h3', 'letter-spacing'));
expect('motion.easeFluid', tokens.motion.easeFluid, tw.transitionTimingFunction.fluid);
expect('motion.easeOut', tokens.motion.easeOut, cssVar('--ease-out'));
expect('motion.durationFast', tokens.motion.durationFast, cssVar('--dur-fast'));
expect('motion.duration', tokens.motion.duration, cssVar('--dur'));

// ── Verre ───────────────────────────────────────────────────────────────────
expect('glass.light.background', tokens.glass.light.background, cssRule('.glass', 'background'));
expect('glass.blur+saturate', `blur(${tokens.glass.blur}) saturate(${tokens.glass.saturate})`, cssRule('.glass', 'backdrop-filter'));
expect('glass.dark.background', tokens.glass.dark.background, cssRule(':is(.dark) .glass', 'background'));
expect('glass.tint.light', tokens.glass.tint.light, cssRule('.glass-tint', 'background'));
expect('card.light.background', tokens.card.light.background, cssRule('.card', 'background'));
expect('card.blur+saturate', `blur(${tokens.card.blur}) saturate(${tokens.card.saturate})`, cssRule('.card', 'backdrop-filter'));
expect('card.dark.background', tokens.card.dark.background, cssRule('.dark .card', 'background'));

// ── Le filet supérieur (gate G2-a) ──────────────────────────────────────────
// Depuis que l'ombre portée est interdite, c'est ce bord plus clair en haut qui
// PORTE la profondeur. Il était dessiné dans le CSS sans jumeau dans tokens.json :
// une dérive silencieuse l'aurait effacé sans qu'aucune porte ne bouge.
expect('glass.light.borderTop', tokens.glass.light.borderTop, cssRule('.glass', 'border-top-color'));
expect('glass.light.border', `1px solid ${tokens.glass.light.border}`, cssRule('.glass', 'border'));
expect('glass.dark.border', tokens.glass.dark.border, cssRule(':is(.dark) .glass', 'border-color'));
expect('glass.dark.borderTop', tokens.glass.dark.borderTop, cssRule(':is(.dark) .glass', 'border-top-color'));
expect('card.light.borderTop', tokens.card.light.borderTop, cssRule('.card', 'border-top-color'));
expect('card.dark.borderTop', tokens.card.dark.borderTop, cssRule('.dark .card', 'border-top-color'));

if (drifts.length) {
  console.error(`check-parity: ${drifts.length} dérive(s) entre packages/tokens/tokens.json et ${appDir}\n`);
  for (const d of drifts) console.error('  ✗ ' + d);
  process.exit(1);
}
console.log(`check-parity: OK — tokens.json v${tokens.$version} aligné sur ${appDir}`);
