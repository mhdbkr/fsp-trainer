#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { report } from './lib/dist.mjs';
const here = dirname(fileURLToPath(import.meta.url));

export function readMatrix(md) {
  const rows = {};
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*`([\w.]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (m) rows[m[1]] = { free: m[2], pro: m[3], premium: m[4] };
  }
  const fc = md.match(/(\d+) cas Free/);
  if (!fc) throw new Error('entitlements.md : « N cas Free » introuvable');
  return { rows, freeCases: Number(fc[1]) };
}

const has = (v) => v !== '—' && v !== '-' && v !== '0';

export function checkPricing({ pricing, entitlementsMd, featuresDir, seedCasesTs = '' }) {
  const e = [];
  const { rows, freeCases } = readMatrix(entitlementsMd);
  if (pricing.freeCases !== freeCases) e.push(`freeCases ${pricing.freeCases} ≠ contrat ${freeCases}`);
  if (pricing.autoRenew !== false) e.push('autoRenew doit être false (C7)');
  for (const b of pricing.billingPeriods) if (!['monthly', '3-months'].includes(b)) e.push(`cadence interdite : ${b} (C7)`);
  const tier3 = (seedCasesTs.match(/tier: 3/g) || []).length;
  const checkLive = (f, where) => {
    if (f.status === 'live' && !f.dir) e.push(`${where} ${f.id}: live sans dir`);
    if (f.status === 'live' && f.dir && !existsSync(join(featuresDir, f.dir))) e.push(`${where} ${f.id}: dossier app/src/features/${f.dir} absent`);
    if (!['live', 'bald'].includes(f.status)) e.push(`${where} ${f.id}: status inconnu`);
  };
  for (const c of pricing.core) checkLive(c, 'core');
  for (const plan of pricing.plans) for (const f of plan.features) {
    checkLive(f, plan.id);
    const [feat, val] = f.id.split(':');
    const row = rows[feat];
    if (!row) { e.push(`${plan.id} ${f.id}: absent de la matrice`); continue; }
    const cell = row[plan.id];
    if (!has(cell)) e.push(`${plan.id} n'a pas ${feat} dans la matrice`);
    if (val !== undefined && cell !== val) e.push(`${plan.id} ${f.id}: ${val} ≠ matrice ${cell}`);
    if (feat === 'content.tier' && Number(val) >= 3 && tier3 === 0) e.push(`${plan.id} ${f.id}: aucun contenu tier 3 publié (C3)`);
    if (!pricing.labels[f.id]) e.push(`label manquant : ${f.id}`);
  }
  return e;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pricing = JSON.parse(readFileSync(resolve(here, '../src/data/pricing.json'), 'utf8'));
  const entitlementsMd = readFileSync(resolve(here, '../../../docs/contracts/entitlements.md'), 'utf8');
  const featuresDir = resolve(here, '../../../app/src/features');
  const seedCasesTs = readFileSync(resolve(here, '../../../app/src/data/seedCases.ts'), 'utf8');
  report(checkPricing({ pricing, entitlementsMd, featuresDir, seedCasesTs }), 'check-pricing-parity (C1–C7, AC8, AC15)');
}
